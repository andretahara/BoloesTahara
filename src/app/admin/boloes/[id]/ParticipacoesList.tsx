'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Participacao {
    id: string
    user_email: string
    user_name: string | null
    quotas: number
    payment_status: string
    created_at: string
}

interface PartipacoesListProps {
    participacoes: Participacao[]
    quotaValue: number
    bolaoId: string
}

export default function ParticipacoesList({ participacoes, quotaValue, bolaoId }: PartipacoesListProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleTogglePayment = async (participacaoId: string, currentStatus: string) => {
        setLoading(participacaoId)
        const newStatus = currentStatus === 'confirmado' ? 'pendente' : 'confirmado'

        try {
            const { error } = await supabase
                .from('participacoes')
                .update({ payment_status: newStatus })
                .eq('id', participacaoId)

            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Erro ao atualizar pagamento:', error)
            alert('Erro ao atualizar status do pagamento')
        } finally {
            setLoading(null)
        }
    }

    const handleRemoveParticipante = async (participacaoId: string, quotas: number) => {
        if (!confirm('Tem certeza que deseja remover este participante?')) return

        setLoading(participacaoId)
        try {
            // Remove participação
            const { error: deleteError } = await supabase
                .from('participacoes')
                .delete()
                .eq('id', participacaoId)

            if (deleteError) throw deleteError

            // Atualiza contagem de cotas no bolão
            const { error: updateError } = await supabase.rpc('decrement_sold_quotas', {
                bolao_id: bolaoId,
                amount: quotas
            })

            // Se a função RPC não existir, faz manualmente
            if (updateError) {
                const { data: bolao } = await supabase
                    .from('boloes')
                    .select('sold_quotas')
                    .eq('id', bolaoId)
                    .single()

                if (bolao) {
                    await supabase
                        .from('boloes')
                        .update({ sold_quotas: Math.max(0, bolao.sold_quotas - quotas) })
                        .eq('id', bolaoId)
                }
            }

            router.refresh()
        } catch (error) {
            console.error('Erro ao remover participante:', error)
            alert('Erro ao remover participante')
        } finally {
            setLoading(null)
        }
    }

    if (participacoes.length === 0) {
        return (
            <div className="glass rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-purple-700/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👥</span>
                </div>
                <p className="text-muted">Nenhum participante ainda</p>
                <p className="text-sm text-muted mt-2">Os participantes aparecerão aqui quando se inscreverem</p>
            </div>
        )
    }

    return (
        <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-sm font-semibold text-muted">Participante</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted">Cotas</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted">Valor</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted">Status</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted">Data</th>
                            <th className="text-center p-4 text-sm font-semibold text-muted">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participacoes.map((p) => (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div>
                                        <p className="font-medium">{p.user_name || 'Sem nome'}</p>
                                        <p className="text-sm text-muted">{p.user_email}</p>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="font-semibold">{p.quotas}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="font-semibold">
                                        R$ {(p.quotas * quotaValue).toFixed(2).replace('.', ',')}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.payment_status === 'confirmado'
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                        }`}>
                                        {p.payment_status === 'confirmado' ? '✅ Confirmado' : '⏳ Pendente'}
                                    </span>
                                </td>
                                <td className="p-4 text-center text-sm text-muted">
                                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleTogglePayment(p.id, p.payment_status)}
                                            disabled={loading === p.id}
                                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${p.payment_status === 'confirmado'
                                                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                }`}
                                        >
                                            {p.payment_status === 'confirmado' ? 'Desconfirmar' : 'Confirmar'}
                                        </button>
                                        <button
                                            onClick={() => handleRemoveParticipante(p.id, p.quotas)}
                                            disabled={loading === p.id}
                                            className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 
                                                       hover:bg-red-500/30 transition-all disabled:opacity-50"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
