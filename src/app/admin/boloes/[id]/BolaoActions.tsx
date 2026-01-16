'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface BolaoActionsProps {
    bolaoId: string
    status: string
}

export default function BolaoActions({ bolaoId, status }: BolaoActionsProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleStatusChange = async (newStatus: string) => {
        if (loading) return

        const confirmMessages: { [key: string]: string } = {
            'fechado': 'Tem certeza que deseja fechar este bolão? Novos participantes não poderão se inscrever.',
            'sorteado': 'Tem certeza que deseja marcar este bolão como sorteado?',
            'aberto': 'Tem certeza que deseja reabrir este bolão?'
        }

        if (!confirm(confirmMessages[newStatus])) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('boloes')
                .update({ status: newStatus })
                .eq('id', bolaoId)

            if (error) throw error
            router.refresh()
        } catch (error) {
            console.error('Erro ao atualizar status:', error)
            alert('Erro ao atualizar o status do bolão')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Tem certeza que deseja excluir este bolão? Esta ação não pode ser desfeita.')) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('boloes')
                .delete()
                .eq('id', bolaoId)

            if (error) throw error
            router.push('/admin')
        } catch (error) {
            console.error('Erro ao excluir bolão:', error)
            alert('Erro ao excluir o bolão')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-wrap gap-2">
            {status === 'aberto' && (
                <button
                    onClick={() => handleStatusChange('fechado')}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 
                               hover:bg-yellow-500/30 transition-all text-sm font-medium disabled:opacity-50"
                >
                    🔒 Fechar Inscrições
                </button>
            )}

            {status === 'fechado' && (
                <>
                    <button
                        onClick={() => handleStatusChange('aberto')}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 
                                   hover:bg-green-500/30 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        🔓 Reabrir
                    </button>
                    <button
                        onClick={() => handleStatusChange('sorteado')}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 
                                   hover:bg-purple-500/30 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        🎉 Marcar como Sorteado
                    </button>
                </>
            )}

            {status === 'sorteado' && (
                <button
                    onClick={() => handleStatusChange('fechado')}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 
                               hover:bg-yellow-500/30 transition-all text-sm font-medium disabled:opacity-50"
                >
                    ↩️ Voltar para Fechado
                </button>
            )}

            <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 
                           hover:bg-red-500/30 transition-all text-sm font-medium disabled:opacity-50"
            >
                🗑️ Excluir
            </button>
        </div>
    )
}
