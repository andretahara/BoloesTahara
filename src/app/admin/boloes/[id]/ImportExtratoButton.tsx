'use client'

import { useState } from 'react'
import ImportExtratoModal from './ImportExtratoModal'
import { useRouter } from 'next/navigation'

interface ImportExtratoButtonProps {
    bolaoId: string
    valorCota: number
    status: string
}

export default function ImportExtratoButton({ bolaoId, valorCota, status }: ImportExtratoButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const router = useRouter()

    // Só mostrar botão para bolões abertos ou fechados (não sorteados)
    if (status === 'sorteado') {
        return null
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 
                           text-blue-400 hover:from-blue-500/30 hover:to-cyan-500/30 transition-all text-sm font-medium
                           flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar Extrato
            </button>

            <ImportExtratoModal
                bolaoId={bolaoId}
                valorCota={valorCota}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setIsModalOpen(false)
                    router.refresh()
                }}
            />
        </>
    )
}
