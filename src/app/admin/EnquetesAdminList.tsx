'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Opcao {
    id: string
    texto: string
}

interface Enquete {
    id: string
    titulo: string
    descricao: string | null
    opcoes: Opcao[]
    dominios_alvo: string[]
    data_fim: string
    status: string
    created_at: string
}

interface Resposta {
    opcao_id: string
    count: number
}

export default function EnquetesAdminList() {
    const [enquetes, setEnquetes] = useState<Enquete[]>([])
    const [respostas, setRespostas] = useState<Record<string, Resposta[]>>({})
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const loadData = async () => {
        setLoading(true)

        // Buscar enquetes
        const { data: enquetesData } = await supabase
            .from('enquetes')
            .select('*')
            .order('created_at', { ascending: false })

        if (enquetesData) {
            setEnquetes(enquetesData)

            // Buscar contagem de respostas para cada enquete
            const respostasMap: Record<string, Resposta[]> = {}
            for (const enquete of enquetesData) {
                const { data: respostasData } = await supabase
                    .from('enquetes_respostas')
                    .select('opcao_id')
                    .eq('enquete_id', enquete.id)

                if (respostasData) {
                    // Agrupar por opção
                    const contagem: Record<string, number> = {}
                    respostasData.forEach(r => {
                        contagem[r.opcao_id] = (contagem[r.opcao_id] || 0) + 1
                    })
                    respostasMap[enquete.id] = Object.entries(contagem).map(([opcao_id, count]) => ({
                        opcao_id,
                        count
                    }))
                }
            }
            setRespostas(respostasMap)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleEncerrar = async (enqueteId: string) => {
        const { error } = await supabase
            .from('enquetes')
            .update({ status: 'encerrada' })
            .eq('id', enqueteId)

        if (!error) {
            loadData()
        }
    }

    const handleExcluir = async (enqueteId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta enquete?')) return

        const { error } = await supabase
            .from('enquetes')
            .delete()
            .eq('id', enqueteId)

        if (!error) {
            loadData()
        }
    }

    const getTotalVotos = (enqueteId: string) => {
        return respostas[enqueteId]?.reduce((acc, r) => acc + r.count, 0) || 0
    }

    const getVotosOpcao = (enqueteId: string, opcaoId: string) => {
        return respostas[enqueteId]?.find(r => r.opcao_id === opcaoId)?.count || 0
    }

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6 text-center text-muted">
                Carregando enquetes...
            </div>
        )
    }

    if (enquetes.length === 0) {
        return (
            <div className="glass rounded-2xl p-6 text-center">
                <p className="text-muted">Nenhuma enquete criada ainda</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold">📊 Enquetes</h3>

            {enquetes.map(enquete => {
                const totalVotos = getTotalVotos(enquete.id)
                const isEncerrada = enquete.status === 'encerrada' || new Date(enquete.data_fim) < new Date()

                return (
                    <div key={enquete.id} className="glass rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-semibold flex items-center gap-2">
                                    {enquete.titulo}
                                    <span className={`px-2 py-0.5 rounded text-xs ${isEncerrada
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-green-500/20 text-green-400'
                                        }`}>
                                        {isEncerrada ? 'Encerrada' : 'Ativa'}
                                    </span>
                                </h4>
                                {enquete.descricao && (
                                    <p className="text-sm text-muted mt-1">{enquete.descricao}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {!isEncerrada && (
                                    <button
                                        onClick={() => handleEncerrar(enquete.id)}
                                        className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                                    >
                                        Encerrar
                                    </button>
                                )}
                                <button
                                    onClick={() => handleExcluir(enquete.id)}
                                    className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>

                        {/* Resultados */}
                        <div className="space-y-2">
                            {enquete.opcoes.map(opcao => {
                                const votos = getVotosOpcao(enquete.id, opcao.id)
                                const percent = totalVotos > 0 ? (votos / totalVotos) * 100 : 0

                                return (
                                    <div key={opcao.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{opcao.texto}</span>
                                            <span className="text-muted">{votos} votos ({percent.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full transition-all"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Info */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                            <span>👥 {totalVotos} votos</span>
                            <span>📅 Encerra: {new Date(enquete.data_fim).toLocaleDateString('pt-BR')}</span>
                            {enquete.dominios_alvo.length > 0 && (
                                <span>🎯 {enquete.dominios_alvo.join(', ')}</span>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
