import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { mensagem, dominio } = body

    if (!mensagem || !dominio) {
        return NextResponse.json({ error: 'Mensagem e domínio são obrigatórios' }, { status: 400 })
    }

    if (mensagem.length > 140) {
        return NextResponse.json({ error: 'Mensagem deve ter no máximo 140 caracteres' }, { status: 400 })
    }

    // Verificar se o chat do domínio está habilitado
    const { data: config } = await supabase
        .from('config_dominios')
        .select('chat_habilitado')
        .eq('dominio', dominio)
        .single()

    if (config && !config.chat_habilitado) {
        return NextResponse.json({
            error: 'O chat de sugestões está temporariamente desabilitado para este domínio',
            bloqueado: true
        }, { status: 403 })
    }

    // Moderar com IA
    const moderacao = await moderarComIA(mensagem)

    if (!moderacao.aprovado) {
        return NextResponse.json({
            error: 'Mensagem não aprovada pela moderação',
            motivo: moderacao.motivo,
            moderado: true
        }, { status: 400 })
    }

    // Salvar comentário
    const userName = user.user_metadata?.nome || user.email?.split('@')[0] || 'Anônimo'

    const { data, error } = await supabase
        .from('comentarios_dominio')
        .insert({
            dominio,
            user_id: user.id,
            user_name: userName,
            user_email: user.email,
            mensagem,
            aprovado: true,
            moderado_por_ia: true
        })
        .select()
        .single()

    if (error) {
        console.error('Erro ao salvar comentário:', error)
        return NextResponse.json({ error: 'Erro ao salvar comentário' }, { status: 500 })
    }

    return NextResponse.json({ success: true, comentario: data })
}

interface ModeracaoResult {
    aprovado: boolean
    motivo: string
}

async function moderarComIA(mensagem: string): Promise<ModeracaoResult> {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        // Sem IA, fazer verificação básica
        return moderacaoBasica(mensagem)
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const prompt = `Você é um moderador de conteúdo para uma plataforma corporativa de bolões.
Analise a seguinte mensagem e determine se ela é apropriada para publicação.

REGRAS:
- Não permitir palavrões ou linguagem vulgar
- Não permitir ofensas pessoais ou bullying
- Não permitir discriminação (raça, gênero, religião, etc)
- Não permitir assédio ou ameaças
- Não permitir spam ou conteúdo irrelevante
- Permitir críticas construtivas e sugestões

MENSAGEM: "${mensagem}"

Responda APENAS com um JSON válido no formato (sem markdown):
{"aprovado": true/false, "motivo": "motivo se rejeitado ou vazio se aprovado"}
`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        const moderacao = JSON.parse(text) as ModeracaoResult
        return moderacao
    } catch (error) {
        console.error('Erro na moderação IA:', error)
        // Fallback para moderação básica
        return moderacaoBasica(mensagem)
    }
}

function moderacaoBasica(mensagem: string): ModeracaoResult {
    const palavrasProibidas = [
        'idiota', 'burro', 'imbecil', 'estupido', 'retardado',
        'merda', 'porra', 'caralho', 'foda', 'fodase',
        'viado', 'bicha', 'sapatao', 'sapata',
        'preto', 'negro', 'macaco', // contexto ofensivo
        'vagabundo', 'lixo', 'nojento'
    ]

    const mensagemLower = mensagem.toLowerCase()

    for (const palavra of palavrasProibidas) {
        if (mensagemLower.includes(palavra)) {
            return {
                aprovado: false,
                motivo: 'Mensagem contém linguagem inapropriada'
            }
        }
    }

    return {
        aprovado: true,
        motivo: ''
    }
}
