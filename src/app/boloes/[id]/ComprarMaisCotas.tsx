'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ComprarMaisCotasProps {
    bolaoId: string
    quotaValue: number
    maxQuotas: number
    currentQuotas: number
    userId: string
    participacaoId: string
}

export default function ComprarMaisCotas({
    bolaoId,
    quotaValue,
    maxQuotas,
    currentQuotas,
    userId,
    participacaoId
}: ComprarMaisCotasProps) {
    const [quotasAdicionais, setQuotasAdicionais] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const totalValue = quotasAdicionais * quotaValue
    const maxAdicionais = Math.min(maxQuotas - currentQuotas, 10)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            // Atualizar participação existente
            const { error: updateError } = await supabase
                .from('participacoes')
                .update({
                    quotas: currentQuotas + quotasAdicionais,
                    payment_status: 'pendente' // Reset para pendente pois há novo valor
                })
                .eq('id', participacaoId)

            if (updateError) {
                throw updateError
            }

            // Atualizar contagem de cotas vendidas do bolão
            const { data: bolao } = await supabase
                .from('boloes')
                .select('sold_quotas')
                .eq('id', bolaoId)
                .single()

            if (bolao) {
                await supabase
                    .from('boloes')
                    .update({ sold_quotas: bolao.sold_quotas + quotasAdicionais })
                    .eq('id', bolaoId)
            }

            setShowForm(false)
            router.refresh()
        } catch (err) {
            console.error('Erro ao comprar mais cotas:', err)
            setError('Ocorreu um erro ao processar sua compra. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    if (!showForm) {
        return (
            <button
                onClick={() => setShowForm(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors font-medium"
            >
                <span>➕</span>
                <span>Comprar Mais Cotas</span>
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <h4 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <span>➕</span>
                Adicionar Cotas
            </h4>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-3">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Quantidade adicional:</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setQuotasAdicionais(Math.max(1, quotasAdicionais - 1))}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-sm"
                            disabled={quotasAdicionais <= 1}
                        >
                            -
                        </button>
                        <span className="w-10 text-center font-bold text-lg">{quotasAdicionais}</span>
                        <button
                            type="button"
                            onClick={() => setQuotasAdicionais(Math.min(maxAdicionais, quotasAdicionais + 1))}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-sm"
                            disabled={quotasAdicionais >= maxAdicionais}
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Valor adicional:</span>
                    <span className="font-bold text-amber-400">
                        R$ {totalValue.toFixed(2).replace('.', ',')}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm border-t border-white/10 pt-3">
                    <span className="text-gray-400">Total de cotas após compra:</span>
                    <span className="font-bold text-white">
                        {currentQuotas + quotasAdicionais}
                    </span>
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Processando...</span>
                        </>
                    ) : (
                        <>
                            <span>✓</span>
                            <span>Confirmar</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
