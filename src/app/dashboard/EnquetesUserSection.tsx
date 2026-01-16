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
}

interface VotosContagem {
    [opcaoId: string]: number
}

interface EnquetesUserSectionProps {
    userEmail: string
}

export default function EnquetesUserSection({ userEmail }: EnquetesUserSectionProps) {
    const [enquetes, setEnquetes] = useState<Enquete[]>([])
    const [votosUsuario, setVotosUsuario] = useState<Record<string, string>>({})
    const [votosContagem, setVotosContagem] = useState<Record<string, VotosContagem>>({})
    const [loading, setLoading] = useState(true)
    const [votando, setVotando] = useState<string | null>(null)
    const supabase = createClient()

    const userDomain = '@' + userEmail.split('@')[1]

    const loadEnquetes = async () => {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Buscar enquetes ativas onde o domínio do usuário está no array ou array está vazio
        const { data: enquetesData } = await supabase
            .from('enquetes')
            .select('*')
            .eq('status', 'ativa')
            .gt('data_fim', new Date().toISOString())
            .order('created_at', { ascending: false })

        if (enquetesData) {
            // Filtrar enquetes relevantes para o usuário
            const enquetesFiltradas = enquetesData.filter(e =>
                e.dominios_alvo.length === 0 || e.dominios_alvo.includes(userDomain)
            )
            setEnquetes(enquetesFiltradas)

            // Buscar votos do usuário
            const { data: votosData } = await supabase
                .from('enquetes_respostas')
                .select('enquete_id, opcao_id')
                .eq('user_id', user.id)

            if (votosData) {
                const votosMap: Record<string, string> = {}
                votosData.forEach(v => {
                    votosMap[v.enquete_id] = v.opcao_id
                })
                setVotosUsuario(votosMap)
            }

            // Buscar contagem de votos para cada enquete
            const contagemMap: Record<string, VotosContagem> = {}
            for (const enquete of enquetesFiltradas) {
                const { data: respostas } = await supabase
                    .from('enquetes_respostas')
                    .select('opcao_id')
                    .eq('enquete_id', enquete.id)

                if (respostas) {
                    const contagem: VotosContagem = {}
                    enquete.opcoes.forEach((opcao: Opcao) => {
                        contagem[opcao.id] = respostas.filter(r => r.opcao_id === opcao.id).length
                    })
                    contagemMap[enquete.id] = contagem
                }
            }
            setVotosContagem(contagemMap)
        }

        setLoading(false)
    }

    useEffect(() => {
        loadEnquetes()
    }, [])

    const handleVotar = async (enqueteId: string, opcaoId: string) => {
        setVotando(enqueteId)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const votoExistente = votosUsuario[enqueteId]

        if (votoExistente) {
            // Atualizar voto existente
            const { error } = await supabase
                .from('enquetes_respostas')
                .update({ opcao_id: opcaoId })
                .eq('enquete_id', enqueteId)
                .eq('user_id', user.id)

            if (!error) {
                // Atualizar contagem local
                const novaContagem = { ...votosContagem }
                if (novaContagem[enqueteId]) {
                    novaContagem[enqueteId][votoExistente] = Math.max(0, (novaContagem[enqueteId][votoExistente] || 1) - 1)
                    novaContagem[enqueteId][opcaoId] = (novaContagem[enqueteId][opcaoId] || 0) + 1
                }
                setVotosContagem(novaContagem)
                setVotosUsuario({ ...votosUsuario, [enqueteId]: opcaoId })
            }
        } else {
            // Novo voto
            const { error } = await supabase
                .from('enquetes_respostas')
                .insert({
                    enquete_id: enqueteId,
                    user_id: user.id,
                    user_email: userEmail,
                    opcao_id: opcaoId
                })

            if (!error) {
                // Atualizar contagem local
                const novaContagem = { ...votosContagem }
                if (novaContagem[enqueteId]) {
                    novaContagem[enqueteId][opcaoId] = (novaContagem[enqueteId][opcaoId] || 0) + 1
                }
                setVotosContagem(novaContagem)
                setVotosUsuario({ ...votosUsuario, [enqueteId]: opcaoId })
            }
        }

        setVotando(null)
    }

    const calcularPorcentagem = (enqueteId: string, opcaoId: string): number => {
        const contagem = votosContagem[enqueteId]
        if (!contagem) return 0

        const totalVotos = Object.values(contagem).reduce((acc, v) => acc + v, 0)
        if (totalVotos === 0) return 0

        return (contagem[opcaoId] || 0) / totalVotos * 100
    }

    const getTotalVotos = (enqueteId: string): number => {
        const contagem = votosContagem[enqueteId]
        if (!contagem) return 0
        return Object.values(contagem).reduce((acc, v) => acc + v, 0)
    }

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6 text-center text-muted">
                Carregando enquetes...
            </div>
        )
    }

    if (enquetes.length === 0) {
        return null // Não mostra nada se não há enquetes
    }

    return (
        <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                📊 Enquetes
            </h2>

            <div className="space-y-4">
                {enquetes.map(enquete => {
                    const votoUsuario = votosUsuario[enquete.id]
                    const totalVotos = getTotalVotos(enquete.id)

                    return (
                        <div key={enquete.id} className="bg-white/5 rounded-xl p-4">
                            <h3 className="font-semibold mb-2">{enquete.titulo}</h3>
                            {enquete.descricao && (
                                <p className="text-sm text-muted mb-3">{enquete.descricao}</p>
                            )}

                            <div className="space-y-2">
                                {enquete.opcoes.map(opcao => {
                                    const porcentagem = calcularPorcentagem(enquete.id, opcao.id)
                                    const votos = votosContagem[enquete.id]?.[opcao.id] || 0
                                    const isSelected = votoUsuario === opcao.id

                                    return (
                                        <button
                                            key={opcao.id}
                                            onClick={() => handleVotar(enquete.id, opcao.id)}
                                            disabled={votando === enquete.id}
                                            className={`w-full p-3 rounded-lg text-sm text-left transition-all relative overflow-hidden disabled:opacity-50 ${isSelected
                                                ? 'bg-amber-500/20 border-2 border-amber-500/50'
                                                : 'bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5'
                                                }`}
                                        >
                                            {/* Barra de progresso */}
                                            <div
                                                className={`absolute inset-0 ${isSelected ? 'bg-amber-500/20' : 'bg-white/5'} transition-all`}
                                                style={{ width: `${porcentagem}%` }}
                                            />

                                            {/* Conteúdo */}
                                            <div className="relative flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    {isSelected && <span className="text-amber-400">✓</span>}
                                                    {opcao.texto}
                                                </span>
                                                <span className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-gray-400'}`}>
                                                    {porcentagem.toFixed(0)}%
                                                </span>
                                            </div>

                                            {/* Votos count */}
                                            <div className="relative text-xs text-gray-500 mt-1">
                                                {votos} {votos === 1 ? 'voto' : 'votos'}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="flex items-center justify-between mt-3 text-xs text-muted">
                                <span>📅 Encerra em {new Date(enquete.data_fim).toLocaleDateString('pt-BR')}</span>
                                <span className="text-amber-400/70">
                                    {totalVotos} {totalVotos === 1 ? 'voto total' : 'votos totais'}
                                </span>
                            </div>

                            {votoUsuario && (
                                <p className="text-xs text-amber-400/50 mt-2">
                                    💡 Clique em outra opção para mudar seu voto
                                </p>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
