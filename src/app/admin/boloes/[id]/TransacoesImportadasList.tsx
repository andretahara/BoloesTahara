'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Transacao {
    id: string
    data_transacao: string
    valor: number
    descricao_original: string
    nome_pagador: string
    status: string
    cotas_identificadas: number
    observacao_ia: string
    motivo_rejeicao: string | null
    created_at: string
}

interface TransacoesImportadasListProps {
    bolaoId: string
}

export default function TransacoesImportadasList({ bolaoId }: TransacoesImportadasListProps) {
    const [transacoes, setTransacoes] = useState<Transacao[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const loadTransacoes = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('transacoes_importadas')
            .select('*')
            .eq('bolao_id', bolaoId)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setTransacoes(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadTransacoes()
    }, [bolaoId])

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('transacoes_importadas')
            .update({
                status: newStatus,
                processado_em: new Date().toISOString()
            })
            .eq('id', id)

        if (!error) {
            loadTransacoes()
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pendente':
                return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">⏳ Pendente</span>
            case 'aprovado':
                return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">✅ Aprovado</span>
            case 'invalido':
                return <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">⚠️ Inválido</span>
            case 'usuario_nao_encontrado':
                return <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">❌ Usuário não encontrado</span>
            case 'ignorado':
                return <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">🔄 Ignorado</span>
            default:
                return <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">{status}</span>
        }
    }

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6 text-center text-muted">
                Carregando transações...
            </div>
        )
    }

    if (transacoes.length === 0) {
        return (
            <div className="glass rounded-2xl p-6 text-center">
                <p className="text-muted">Nenhuma transação importada ainda</p>
                <p className="text-sm text-muted/70 mt-1">
                    Use o botão &quot;Importar Extrato&quot; para analisar depósitos PIX
                </p>
            </div>
        )
    }

    // Estatísticas
    const pendentes = transacoes.filter(t => t.status === 'pendente').length
    const aprovados = transacoes.filter(t => t.status === 'aprovado').length
    const invalidos = transacoes.filter(t => t.status === 'invalido' || t.status === 'usuario_nao_encontrado').length
    const totalCotas = transacoes.filter(t => t.status === 'aprovado').reduce((acc, t) => acc + t.cotas_identificadas, 0)

    return (
        <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                📊 Transações Importadas
            </h3>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-yellow-500/10 rounded-xl">
                    <div className="text-xl font-bold text-yellow-400">{pendentes}</div>
                    <div className="text-xs text-muted">Pendentes</div>
                </div>
                <div className="text-center p-3 bg-green-500/10 rounded-xl">
                    <div className="text-xl font-bold text-green-400">{aprovados}</div>
                    <div className="text-xs text-muted">Aprovados</div>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-xl">
                    <div className="text-xl font-bold text-red-400">{invalidos}</div>
                    <div className="text-xs text-muted">Inválidos</div>
                </div>
                <div className="text-center p-3 bg-purple-500/10 rounded-xl">
                    <div className="text-xl font-bold text-purple-400">{totalCotas}</div>
                    <div className="text-xs text-muted">Cotas OK</div>
                </div>
            </div>

            {/* Lista */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {transacoes.map((t) => (
                    <div
                        key={t.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{t.nome_pagador}</span>
                                {getStatusBadge(t.status)}
                            </div>
                            <div className="text-sm text-muted mt-1">
                                {new Date(t.data_transacao).toLocaleDateString('pt-BR')} •
                                {t.descricao_original?.substring(0, 40)}...
                            </div>
                            {t.motivo_rejeicao && (
                                <div className="text-xs text-red-400/80 mt-1">
                                    {t.motivo_rejeicao}
                                </div>
                            )}
                        </div>
                        <div className="text-right flex items-center gap-4">
                            <div>
                                <div className="font-bold">R$ {t.valor.toFixed(2)}</div>
                                {t.cotas_identificadas > 0 && (
                                    <div className="text-sm text-purple-400">
                                        {t.cotas_identificadas} cota(s)
                                    </div>
                                )}
                            </div>
                            {/* Ações */}
                            {t.status === 'pendente' && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleUpdateStatus(t.id, 'aprovado')}
                                        className="px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs"
                                        title="Aprovar"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(t.id, 'ignorado')}
                                        className="px-2 py-1 rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 text-xs"
                                        title="Ignorar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
