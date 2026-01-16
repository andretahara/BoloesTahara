import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/authorized-admins'
import { GoogleGenerativeAI } from '@google/generative-ai'
import crypto from 'crypto'

// Gera hash único para uma transação
function gerarHashTransacao(data: string, valor: number, descricao: string): string {
    const str = `${data}-${valor}-${descricao}`.toLowerCase().trim()
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 32)
}

// Tipos
interface TransacaoAnalisada {
    data_transacao: string
    valor: number
    descricao_original: string
    nome_pagador: string
    documento_pagador: string | null
    tipo_transacao: string
    cotas_identificadas: number
    status: string
    confianca_ia: number
    observacao_ia: string
    motivo_rejeicao: string | null
    user_email_sugerido: string | null
}

interface AnaliseIA {
    transacoes: TransacaoAnalisada[]
    resumo: {
        total_depositos: number
        total_valor: number
        cotas_identificadas: number
        depositos_validos: number
        depositos_invalidos: number
        usuarios_nao_encontrados: number
        ja_processados: number
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: bolaoId } = await params
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o bolão existe
    const { data: bolao, error: bolaoError } = await supabase
        .from('boloes')
        .select('*')
        .eq('id', bolaoId)
        .single()

    if (bolaoError || !bolao) {
        return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })
    }

    // Pegar o CSV do corpo da requisição
    const formData = await request.formData()
    const file = formData.get('csv') as File

    if (!file) {
        return NextResponse.json({ error: 'Arquivo CSV é obrigatório' }, { status: 400 })
    }

    const csvContent = await file.text()

    // Buscar usuários cadastrados
    const { data: participantes } = await supabase
        .from('participacoes')
        .select('user_id, user_email, user_name')
        .eq('bolao_id', bolaoId)

    // Buscar transações já processadas para este bolão
    const { data: transacoesExistentes } = await supabase
        .from('transacoes_importadas')
        .select('hash_transacao')
        .eq('bolao_id', bolaoId)

    const hashesExistentes = new Set(transacoesExistentes?.map(t => t.hash_transacao) || [])

    // Chamar a IA para análise
    const analise = await analisarComGemini(
        csvContent,
        bolao.quota_value,
        participantes || [],
        Array.from(hashesExistentes)
    )

    if (!analise) {
        return NextResponse.json({ error: 'Erro ao analisar o extrato com IA' }, { status: 500 })
    }

    // Gerar ID único para este lote de importação
    const loteId = crypto.randomUUID()

    // Salvar transações no banco
    const transacoesParaSalvar = analise.transacoes.map(t => ({
        bolao_id: bolaoId,
        hash_transacao: gerarHashTransacao(t.data_transacao, t.valor, t.descricao_original),
        data_transacao: t.data_transacao,
        valor: t.valor,
        descricao_original: t.descricao_original,
        tipo_transacao: t.tipo_transacao,
        nome_pagador: t.nome_pagador,
        documento_pagador: t.documento_pagador,
        status: hashesExistentes.has(gerarHashTransacao(t.data_transacao, t.valor, t.descricao_original))
            ? 'ignorado'
            : t.status,
        cotas_identificadas: t.cotas_identificadas,
        confianca_ia: t.confianca_ia,
        observacao_ia: hashesExistentes.has(gerarHashTransacao(t.data_transacao, t.valor, t.descricao_original))
            ? 'Transação já processada anteriormente'
            : t.observacao_ia,
        motivo_rejeicao: t.motivo_rejeicao,
        lote_importacao: loteId
    }))

    // Filtrar transações já existentes (evitar erro de duplicata)
    const transacoesNovas = transacoesParaSalvar.filter(
        t => !hashesExistentes.has(t.hash_transacao)
    )

    if (transacoesNovas.length > 0) {
        const { error: insertError } = await supabase
            .from('transacoes_importadas')
            .insert(transacoesNovas)

        if (insertError) {
            console.error('Erro ao salvar transações:', insertError)
            return NextResponse.json({
                error: 'Erro ao salvar transações',
                details: insertError.message
            }, { status: 500 })
        }
    }

    // Atualizar resumo com info de duplicatas
    const duplicatas = transacoesParaSalvar.length - transacoesNovas.length
    analise.resumo.ja_processados = duplicatas

    return NextResponse.json({
        success: true,
        lote_id: loteId,
        analise: analise,
        transacoes_salvas: transacoesNovas.length,
        transacoes_ignoradas: duplicatas
    })
}

async function analisarComGemini(
    csvContent: string,
    valorCota: number,
    participantes: Array<{ user_id: string; user_email: string; user_name: string | null }>,
    hashesJaProcessados: string[]
): Promise<AnaliseIA | null> {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        console.error('GEMINI_API_KEY não configurada')
        // Retornar análise simples sem IA
        return analisarSemIA(csvContent, valorCota, participantes)
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        const listaParticipantes = participantes.map(p =>
            `${p.user_name || 'Sem nome'} (${p.user_email})`
        ).join('\n')

        const prompt = `Você é um assistente especializado em análise de extratos bancários.
Analise o seguinte extrato bancário em formato CSV e identifique APENAS os depósitos PIX de entrada (créditos).

INFORMAÇÕES DO BOLÃO:
- Valor da cota: R$ ${valorCota.toFixed(2)}
- Cotas válidas são MÚLTIPLOS EXATOS deste valor

PARTICIPANTES CADASTRADOS:
${listaParticipantes || 'Nenhum participante cadastrado ainda'}

EXTRATO CSV:
${csvContent}

INSTRUÇÕES:
1. Identifique todas as transações que parecem ser depósitos PIX de entrada
2. Para cada depósito, extraia: data, valor, nome do pagador
3. Calcule quantas cotas o valor corresponde (valor ÷ ${valorCota})
4. Se o valor NÃO for múltiplo exato da cota, marque como "invalido"
5. Tente associar o nome do pagador a um dos participantes cadastrados
6. Se não encontrar o participante, marque como "usuario_nao_encontrado"
7. Se encontrar e o valor for válido, marque como "pendente" (aguardando aprovação)

Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem \`\`\`):
{
  "transacoes": [
    {
      "data_transacao": "2024-01-15T10:30:00",
      "valor": 30.00,
      "descricao_original": "PIX recebido de JOAO SILVA",
      "nome_pagador": "João Silva",
      "documento_pagador": null,
      "tipo_transacao": "pix_entrada",
      "cotas_identificadas": 3,
      "status": "pendente",
      "confianca_ia": 0.95,
      "observacao_ia": "3 cotas identificadas, usuário encontrado",
      "motivo_rejeicao": null,
      "user_email_sugerido": "joao@experian.com"
    }
  ],
  "resumo": {
    "total_depositos": 5,
    "total_valor": 150.00,
    "cotas_identificadas": 15,
    "depositos_validos": 4,
    "depositos_invalidos": 1,
    "usuarios_nao_encontrados": 0,
    "ja_processados": 0
  }
}

Status possíveis: "pendente", "invalido", "usuario_nao_encontrado"
`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Limpar resposta (remover markdown se presente)
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        const analise = JSON.parse(jsonText) as AnaliseIA
        return analise
    } catch (error) {
        console.error('Erro ao chamar Gemini:', error)
        // Fallback para análise sem IA
        return analisarSemIA(csvContent, valorCota, participantes)
    }
}

// Análise simples sem IA (fallback)
function analisarSemIA(
    csvContent: string,
    valorCota: number,
    participantes: Array<{ user_id: string; user_email: string; user_name: string | null }>
): AnaliseIA {
    const linhas = csvContent.split('\n').filter(l => l.trim())
    const transacoes: TransacaoAnalisada[] = []

    // Tenta parsear CSV básico
    // Assume formato: data, descricao, valor (ou variações)
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i]
        const colunas = linha.split(/[,;]/).map(c => c.trim().replace(/"/g, ''))

        if (colunas.length < 3) continue

        // Tentar encontrar valor monetário
        let valor = 0
        let data = ''
        let descricao = ''

        for (const col of colunas) {
            // Detectar valor monetário
            const valorMatch = col.match(/R?\$?\s*([\d.,]+)/i)
            if (valorMatch && !valor) {
                valor = parseFloat(valorMatch[1].replace('.', '').replace(',', '.'))
            }
            // Detectar data
            const dataMatch = col.match(/(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/)
            if (dataMatch && !data) {
                data = dataMatch[1]
            }
            // Pegar descrição
            if (col.toLowerCase().includes('pix') || col.toLowerCase().includes('transf')) {
                descricao = col
            }
        }

        if (!descricao && colunas[1]) descricao = colunas[1]

        // Só interessa depósitos (valores positivos)
        if (valor <= 0) continue

        // Verificar se é PIX
        const isPix = descricao.toLowerCase().includes('pix')

        // Calcular cotas
        const cotas = Math.floor(valor / valorCota)
        const resto = valor % valorCota
        const isMultiplo = resto < 0.01

        // Tentar encontrar nome do pagador
        const nomePagadorMatch = descricao.match(/(?:de|from|pagador:?)\s*([A-Za-zÀ-ÿ\s]+)/i)
        const nomePagador = nomePagadorMatch ? nomePagadorMatch[1].trim() : 'Não identificado'

        // Tentar associar a participante
        let userEmailSugerido: string | null = null
        if (nomePagador !== 'Não identificado') {
            const participante = participantes.find(p =>
                p.user_name?.toLowerCase().includes(nomePagador.toLowerCase()) ||
                nomePagador.toLowerCase().includes(p.user_name?.toLowerCase() || '')
            )
            if (participante) {
                userEmailSugerido = participante.user_email
            }
        }

        let status: string
        let motivo: string | null = null

        if (!isMultiplo) {
            status = 'invalido'
            motivo = `Valor R$ ${valor.toFixed(2)} não é múltiplo de R$ ${valorCota.toFixed(2)}`
        } else if (!userEmailSugerido) {
            status = 'usuario_nao_encontrado'
            motivo = `Pagador "${nomePagador}" não encontrado na lista de participantes`
        } else {
            status = 'pendente'
        }

        transacoes.push({
            data_transacao: data || new Date().toISOString().split('T')[0],
            valor,
            descricao_original: descricao,
            nome_pagador: nomePagador,
            documento_pagador: null,
            tipo_transacao: isPix ? 'pix_entrada' : 'outro',
            cotas_identificadas: isMultiplo ? cotas : 0,
            status,
            confianca_ia: 0.5,
            observacao_ia: 'Análise básica (sem IA)',
            motivo_rejeicao: motivo,
            user_email_sugerido: userEmailSugerido
        })
    }

    const validos = transacoes.filter(t => t.status === 'pendente')
    const invalidos = transacoes.filter(t => t.status === 'invalido')
    const naoEncontrados = transacoes.filter(t => t.status === 'usuario_nao_encontrado')

    return {
        transacoes,
        resumo: {
            total_depositos: transacoes.length,
            total_valor: transacoes.reduce((acc, t) => acc + t.valor, 0),
            cotas_identificadas: transacoes.reduce((acc, t) => acc + t.cotas_identificadas, 0),
            depositos_validos: validos.length,
            depositos_invalidos: invalidos.length,
            usuarios_nao_encontrados: naoEncontrados.length,
            ja_processados: 0
        }
    }
}
