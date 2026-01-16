import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// API para executar um agente de IA
export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookies) {
                        cookies.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    },
                },
            }
        );

        const { agente_id } = await request.json();

        if (!agente_id) {
            return NextResponse.json({ error: 'agente_id é obrigatório' }, { status: 400 });
        }

        // Buscar agente
        const { data: agente, error: agenteError } = await supabase
            .from('agentes_ia')
            .select('*')
            .eq('id', agente_id)
            .single();

        if (agenteError || !agente) {
            return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
        }

        if (!agente.ativo) {
            return NextResponse.json({ error: 'Agente está inativo' }, { status: 400 });
        }

        // Criar registro de execução
        const { data: execucao, error: execError } = await supabase
            .from('agentes_execucoes')
            .insert({
                agente_id,
                status: 'running',
            })
            .select()
            .single();

        if (execError) {
            return NextResponse.json({ error: 'Erro ao criar execução' }, { status: 500 });
        }

        let resultado: Record<string, unknown> = {};
        let erro: string | null = null;
        let tokensUsados = 0;

        try {
            // Executar lógica específica do agente
            switch (agente.tipo) {
                case 'homepage':
                    resultado = await executarAgenteHomepage(agente.prompt, supabase);
                    break;
                case 'moderacao':
                    resultado = await executarAgenteModeracao(agente.prompt, supabase);
                    break;
                case 'csv_stats':
                    resultado = await executarAgenteCsvStats(agente.prompt, supabase);
                    break;
                default:
                    throw new Error('Tipo de agente desconhecido');
            }

            tokensUsados = resultado.tokens_usados as number || 0;

            // Atualizar execução como sucesso
            await supabase
                .from('agentes_execucoes')
                .update({
                    status: 'success',
                    fim: new Date().toISOString(),
                    resultado,
                    tokens_usados: tokensUsados,
                })
                .eq('id', execucao.id);

            // Atualizar última execução do agente
            await supabase
                .from('agentes_ia')
                .update({ ultima_execucao: new Date().toISOString() })
                .eq('id', agente_id);

        } catch (err) {
            erro = err instanceof Error ? err.message : 'Erro desconhecido';

            // Atualizar execução como erro
            await supabase
                .from('agentes_execucoes')
                .update({
                    status: 'error',
                    fim: new Date().toISOString(),
                    erro,
                })
                .eq('id', execucao.id);

            return NextResponse.json({
                error: erro,
                execucao_id: execucao.id
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            execucao_id: execucao.id,
            resultado,
            tokens_usados: tokensUsados,
        });

    } catch (err) {
        console.error('Erro na API de agentes:', err);
        return NextResponse.json({
            error: 'Erro interno do servidor'
        }, { status: 500 });
    }
}

// Agente de Homepage - Gera conteúdo promocional
async function executarAgenteHomepage(prompt: string, supabase: ReturnType<typeof createServerClient>) {
    // Buscar dados atuais de bolões para contexto
    const { data: boloes } = await supabase
        .from('boloes')
        .select('*')
        .eq('status', 'aberto')
        .order('created_at', { ascending: false })
        .limit(5);

    const contexto = `
Bolões ativos: ${boloes?.length || 0}
${boloes?.map((b: { name: string; sold_quotas: number; total_quotas: number | null; quota_value: string; deadline: string }) => `- ${b.name}: ${b.sold_quotas}/${b.total_quotas || '∞'} cotas vendidas, R$${b.quota_value}/cota, deadline: ${b.deadline}`).join('\n') || 'Nenhum bolão ativo'}
  `;

    // Chamar Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
        // Fallback sem IA
        return {
            titulo: 'Participe do maior bolão da empresa!',
            subtitulo: 'Junte-se aos colegas e concorra a prêmios milionários',
            destaque: `${boloes?.length || 0} bolões ativos`,
            cta_texto: 'Entrar Agora',
            modo: 'fallback',
            tokens_usados: 0,
        };
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${prompt}\n\nContexto atual:\n${contexto}\n\nRetorne o JSON:`,
                    }],
                }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 500,
                },
            }),
        }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const resultado = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
        ...resultado,
        modo: 'gemini',
        tokens_usados: data.usageMetadata?.totalTokenCount || 0,
    };
}

// Agente de Moderação - Analisa comentários pendentes
async function executarAgenteModeracao(prompt: string, supabase: ReturnType<typeof createServerClient>) {
    // Buscar comentários não moderados
    const { data: comentarios } = await supabase
        .from('comentarios_dominio')
        .select('*')
        .eq('moderado_por_ia', false)
        .eq('aprovado', true) // Ainda não rejeitados
        .limit(10);

    if (!comentarios || comentarios.length === 0) {
        return {
            mensagem: 'Nenhum comentário pendente de moderação',
            processados: 0,
            tokens_usados: 0,
        };
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
        // Fallback: aprovar todos
        return {
            mensagem: 'Moderação automática desativada (sem GEMINI_API_KEY)',
            processados: 0,
            tokens_usados: 0,
        };
    }

    let aprovados = 0;
    let rejeitados = 0;
    let tokensTotal = 0;

    for (const comentario of comentarios) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `${prompt}\n\nComentário a analisar: "${comentario.mensagem}"\n\nRetorne o JSON:`,
                            }],
                        }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 200,
                        },
                    }),
                }
            );

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            tokensTotal += data.usageMetadata?.totalTokenCount || 0;

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const resultado = jsonMatch ? JSON.parse(jsonMatch[0]) : { decisao: 'aprovar' };

            if (resultado.decisao === 'rejeitar') {
                await supabase
                    .from('comentarios_dominio')
                    .update({
                        aprovado: false,
                        moderado_por_ia: true,
                        motivo_rejeicao: resultado.motivo || 'Rejeitado pela IA',
                    })
                    .eq('id', comentario.id);
                rejeitados++;
            } else {
                await supabase
                    .from('comentarios_dominio')
                    .update({ moderado_por_ia: true })
                    .eq('id', comentario.id);
                aprovados++;
            }

        } catch (err) {
            console.error('Erro ao moderar comentário:', err);
        }
    }

    return {
        processados: comentarios.length,
        aprovados,
        rejeitados,
        tokens_usados: tokensTotal,
    };
}

// Agente de CSV Stats - Analisa estatísticas de transações
async function executarAgenteCsvStats(prompt: string, supabase: ReturnType<typeof createServerClient>) {
    // Buscar transações recentes
    const { data: transacoes } = await supabase
        .from('transacoes_importadas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (!transacoes || transacoes.length === 0) {
        return {
            mensagem: 'Nenhuma transação importada para analisar',
            total_transacoes: 0,
            tokens_usados: 0,
        };
    }

    const stats = {
        total_transacoes: transacoes.length,
        valor_total: transacoes.reduce((acc: number, t: { valor: string }) => acc + parseFloat(t.valor || '0'), 0),
        aprovadas: transacoes.filter((t: { status: string }) => t.status === 'aprovado').length,
        pendentes: transacoes.filter((t: { status: string }) => t.status === 'pendente').length,
        rejeitadas: transacoes.filter((t: { status: string }) => t.status === 'invalido').length,
    };

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
        return {
            ...stats,
            modo: 'fallback',
            alertas: [],
            tokens_usados: 0,
        };
    }

    // Pedir análise ao Gemini
    const contexto = `
Total de transações: ${stats.total_transacoes}
Valor total: R$ ${stats.valor_total.toFixed(2)}
Aprovadas: ${stats.aprovadas}
Pendentes: ${stats.pendentes}
Rejeitadas: ${stats.rejeitadas}
  `;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${prompt}\n\nDados atuais:\n${contexto}\n\nRetorne o JSON com análise:`,
                    }],
                }],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 500,
                },
            }),
        }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analise = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
        ...stats,
        ...analise,
        modo: 'gemini',
        tokens_usados: data.usageMetadata?.totalTokenCount || 0,
    };
}
