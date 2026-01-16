'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ParticiparFormProps {
    bolaoId: string
    quotaValue: number
    maxQuotas: number
    userId: string
    userEmail: string
    userName: string
}

export default function ParticiparForm({
    bolaoId,
    quotaValue,
    maxQuotas,
    userId,
    userEmail,
    userName
}: ParticiparFormProps) {
    const [quotas, setQuotas] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const totalValue = quotas * quotaValue

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Criar participação
            const { error: participacaoError } = await supabase
                .from('participacoes')
                .insert({
                    bolao_id: bolaoId,
                    user_id: userId,
                    user_email: userEmail,
                    user_name: userName,
                    quotas: quotas,
                    payment_status: 'pendente'
                })

            if (participacaoError) {
                if (participacaoError.message.includes('duplicate')) {
                    setError('Você já está participando deste bolão.')
                } else {
                    throw participacaoError
                }
                setLoading(false)
                return
            }

            // Atualizar contagem de cotas vendidas
            const { error: updateError } = await supabase.rpc('increment_sold_quotas', {
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
                        .update({ sold_quotas: bolao.sold_quotas + quotas })
                        .eq('id', bolaoId)
                }
            }

            router.refresh()
        } catch (err) {
            console.error('Erro ao participar:', err)
            setError('Ocorreu um erro ao processar sua participação. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">Participar do Bolão</h3>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-4">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Quantas cotas você quer comprar?
                    </label>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setQuotas(Math.max(1, quotas - 1))}
                            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center font-bold"
                            disabled={quotas <= 1}
                        >
                            -
                        </button>
                        <input
                            type="number"
                            value={quotas}
                            onChange={(e) => setQuotas(Math.min(maxQuotas, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="w-20 text-center text-2xl font-bold bg-transparent border-none outline-none"
                            min={1}
                            max={maxQuotas}
                        />
                        <button
                            type="button"
                            onClick={() => setQuotas(Math.min(maxQuotas, quotas + 1))}
                            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center font-bold"
                            disabled={quotas >= maxQuotas}
                        >
                            +
                        </button>
                    </div>
                    <p className="text-xs text-muted mt-2">Máximo de {maxQuotas} cotas por pessoa</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted">Valor por cota</span>
                        <span>R$ {quotaValue.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-muted">Quantidade</span>
                        <span>× {quotas}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 mt-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Total a pagar</span>
                            <span className="text-2xl font-bold text-gold">
                                R$ {totalValue.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Processando...</span>
                        </>
                    ) : (
                        <>
                            <span>🎟️</span>
                            <span>Confirmar Participação</span>
                        </>
                    )}
                </button>

                <p className="text-xs text-muted text-center">
                    Após confirmar, entre em contato com o administrador para efetuar o pagamento via PIX.
                </p>
            </div>
        </form>
    )
}
