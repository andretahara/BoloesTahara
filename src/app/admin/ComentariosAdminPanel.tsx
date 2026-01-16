'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comentario {
    id: string
    dominio: string
    user_name: string
    user_email: string
    mensagem: string
    created_at: string
    deletado: boolean
}

interface ConfigDominio {
    dominio: string
    chat_habilitado: boolean
    bloqueado_em: string | null
}

export default function ComentariosAdminPanel() {
    const [dominios, setDominios] = useState<string[]>([])
    const [dominioAtivo, setDominioAtivo] = useState<string>('')
    const [comentarios, setComentarios] = useState<Comentario[]>([])
    const [configs, setConfigs] = useState<Record<string, ConfigDominio>>({})
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const loadDominios = async () => {
        // Buscar todos os domínios com comentários
        const { data } = await supabase
            .from('comentarios_dominio')
            .select('dominio')

        if (data) {
            const uniqueDominios = [...new Set(data.map(c => c.dominio))]
            setDominios(uniqueDominios)
            if (uniqueDominios.length > 0 && !dominioAtivo) {
                setDominioAtivo(uniqueDominios[0])
            }
        }

        // Buscar configs de domínios
        const { data: configData } = await supabase
            .from('config_dominios')
            .select('*')

        if (configData) {
            const configMap: Record<string, ConfigDominio> = {}
            configData.forEach(c => {
                configMap[c.dominio] = c
            })
            setConfigs(configMap)
        }

        setLoading(false)
    }

    const loadComentarios = async (dominio: string) => {
        const { data } = await supabase
            .from('comentarios_dominio')
            .select('*')
            .eq('dominio', dominio)
            .order('created_at', { ascending: false })
            .limit(100)

        if (data) {
            setComentarios(data)
        }
    }

    useEffect(() => {
        loadDominios()
    }, [])

    useEffect(() => {
        if (dominioAtivo) {
            loadComentarios(dominioAtivo)
        }
    }, [dominioAtivo])

    const handleDeleteComentario = async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('comentarios_dominio')
            .update({ deletado: true, deletado_por: user.id })
            .eq('id', id)

        if (!error) {
            loadComentarios(dominioAtivo)
        }
    }

    const handleToggleDominio = async (dominio: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const atualConfig = configs[dominio]
        const novoStatus = atualConfig ? !atualConfig.chat_habilitado : false

        const { error } = await supabase
            .from('config_dominios')
            .upsert({
                dominio,
                chat_habilitado: novoStatus,
                bloqueado_em: novoStatus ? null : new Date().toISOString(),
                bloqueado_por: novoStatus ? null : user.id
            })

        if (!error) {
            loadDominios()
        }
    }

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6 text-center text-muted">
                Carregando...
            </div>
        )
    }

    if (dominios.length === 0) {
        return (
            <div className="glass rounded-2xl p-6 text-center">
                <p className="text-muted">Nenhum comentário encontrado ainda</p>
            </div>
        )
    }

    return (
        <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                💬 Moderação de Comentários
            </h3>

            {/* Tabs de domínios */}
            <div className="flex flex-wrap gap-2 mb-4">
                {dominios.map(dominio => {
                    const config = configs[dominio]
                    const bloqueado = config && !config.chat_habilitado

                    return (
                        <button
                            key={dominio}
                            onClick={() => setDominioAtivo(dominio)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${dominioAtivo === dominio
                                    ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                                    : 'bg-white/5 text-muted border border-white/10 hover:border-white/20'
                                }`}
                        >
                            {bloqueado && <span className="text-red-400">🔒</span>}
                            {dominio}
                        </button>
                    )
                })}
            </div>

            {/* Controles do domínio */}
            {dominioAtivo && (
                <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-lg">
                    <span className="text-sm">
                        Status: {configs[dominioAtivo]?.chat_habilitado !== false ? (
                            <span className="text-green-400">Habilitado</span>
                        ) : (
                            <span className="text-red-400">Bloqueado</span>
                        )}
                    </span>
                    <button
                        onClick={() => handleToggleDominio(dominioAtivo)}
                        className={`px-3 py-1 rounded text-sm ${configs[dominioAtivo]?.chat_habilitado !== false
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            }`}
                    >
                        {configs[dominioAtivo]?.chat_habilitado !== false ? '🔒 Bloquear' : '🔓 Desbloquear'}
                    </button>
                </div>
            )}

            {/* Lista de comentários */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {comentarios.map(c => (
                    <div
                        key={c.id}
                        className={`flex items-start justify-between p-3 rounded-lg ${c.deletado ? 'bg-red-500/5 opacity-50' : 'bg-white/5'
                            }`}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{c.user_name}</span>
                                <span className="text-xs text-muted">{c.user_email}</span>
                                <span className="text-xs text-muted">
                                    {new Date(c.created_at).toLocaleString('pt-BR')}
                                </span>
                            </div>
                            <p className="text-sm mt-1">
                                {c.deletado && <span className="text-red-400">[DELETADO] </span>}
                                {c.mensagem}
                            </p>
                        </div>
                        {!c.deletado && (
                            <button
                                onClick={() => handleDeleteComentario(c.id)}
                                className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs"
                                title="Deletar comentário"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
