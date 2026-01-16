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

interface EnquetesUserSectionProps {
    userEmail: string
}

export default function EnquetesUserSection({ userEmail }: EnquetesUserSectionProps) {
    const [enquetes, setEnquetes] = useState<Enquete[]>([])
    const [votosUsuario, setVotosUsuario] = useState<Record<string, string>>({})
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

        const { error } = await supabase
            .from('enquetes_respostas')
            .insert({
                enquete_id: enqueteId,
                user_id: user.id,
                user_email: userEmail,
                opcao_id: opcaoId
            })

        if (!error) {
            setVotosUsuario({ ...votosUsuario, [enqueteId]: opcaoId })
        }

        setVotando(null)
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
                    const jaVotou = !!votoUsuario

                    return (
                        <div key={enquete.id} className="bg-white/5 rounded-xl p-4">
                            <h3 className="font-semibold mb-2">{enquete.titulo}</h3>
                            {enquete.descricao && (
                                <p className="text-sm text-muted mb-3">{enquete.descricao}</p>
                            )}

                            {jaVotou ? (
                                <div className="space-y-2">
                                    {enquete.opcoes.map(opcao => (
                                        <div
                                            key={opcao.id}
                                            className={`p-3 rounded-lg text-sm ${votoUsuario === opcao.id
                                                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                                                    : 'bg-white/5'
                                                }`}
                                        >
                                            {opcao.texto}
                                            {votoUsuario === opcao.id && (
                                                <span className="ml-2 text-yellow-400">✓ Seu voto</span>
                                            )}
                                        </div>
                                    ))}
                                    <p className="text-xs text-muted mt-2">
                                        Você já votou nesta enquete
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {enquete.opcoes.map(opcao => (
                                        <button
                                            key={opcao.id}
                                            onClick={() => handleVotar(enquete.id, opcao.id)}
                                            disabled={votando === enquete.id}
                                            className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all text-sm text-left disabled:opacity-50"
                                        >
                                            {opcao.texto}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-muted mt-3">
                                📅 Encerra em {new Date(enquete.data_fim).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
