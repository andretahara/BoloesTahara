'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comentario {
    id: string
    user_name: string
    user_email: string
    mensagem: string
    created_at: string
    deletado: boolean
}

interface ComentariosDominioProps {
    userEmail: string
    userName: string
}

export default function ComentariosDominio({ userEmail, userName }: ComentariosDominioProps) {
    const [comentarios, setComentarios] = useState<Comentario[]>([])
    const [novaMensagem, setNovaMensagem] = useState('')
    const [loading, setLoading] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState('')
    const [chatBloqueado, setChatBloqueado] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)

    const dominio = '@' + userEmail.split('@')[1]
    const supabase = createClient()

    const loadComentarios = async () => {
        // Verificar status do chat
        const { data: config } = await supabase
            .from('config_dominios')
            .select('chat_habilitado')
            .eq('dominio', dominio)
            .single()

        setChatBloqueado(config ? !config.chat_habilitado : false)

        // Buscar comentários
        const { data } = await supabase
            .from('comentarios_dominio')
            .select('*')
            .eq('dominio', dominio)
            .eq('deletado', false)
            .order('created_at', { ascending: true })
            .limit(50)

        if (data) {
            setComentarios(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadComentarios()

        // Inscrever para atualizações em tempo real
        const channel = supabase
            .channel('comentarios-' + dominio)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comentarios_dominio',
                    filter: `dominio=eq.${dominio}`
                },
                (payload) => {
                    setComentarios(prev => [...prev, payload.new as Comentario])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [dominio])

    useEffect(() => {
        // Scroll para o final quando novos comentários chegarem
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [comentarios])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!novaMensagem.trim() || enviando || chatBloqueado) return

        setEnviando(true)
        setErro('')

        try {
            const response = await fetch('/api/comentarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mensagem: novaMensagem.trim(),
                    dominio
                })
            })

            const data = await response.json()

            if (!response.ok) {
                setErro(data.motivo || data.error)
            } else {
                setNovaMensagem('')
            }
        } catch {
            setErro('Erro ao enviar mensagem')
        } finally {
            setEnviando(false)
        }
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHrs = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'agora'
        if (diffMins < 60) return `${diffMins}min`
        if (diffHrs < 24) return `${diffHrs}h`
        if (diffDays < 7) return `${diffDays}d`
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }

    if (loading) {
        return (
            <div className="glass rounded-2xl p-6 text-center text-muted">
                Carregando...
            </div>
        )
    }

    return (
        <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                💬 Sugestões & Comentários
                <span className="text-sm font-normal text-muted">{dominio}</span>
            </h2>

            {chatBloqueado && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                    ⚠️ O chat está temporariamente desabilitado para este domínio
                </div>
            )}

            {/* Lista de comentários */}
            <div
                ref={listRef}
                className="h-64 overflow-y-auto space-y-3 mb-4 p-2 bg-white/5 rounded-xl"
            >
                {comentarios.length === 0 ? (
                    <p className="text-center text-muted py-8">
                        Nenhum comentário ainda. Seja o primeiro!
                    </p>
                ) : (
                    comentarios.map(c => (
                        <div
                            key={c.id}
                            className={`p-3 rounded-lg ${c.user_email === userEmail
                                    ? 'bg-yellow-500/10 ml-8'
                                    : 'bg-white/5 mr-8'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">
                                    {c.user_email === userEmail ? 'Você' : c.user_name}
                                </span>
                                <span className="text-xs text-muted">{formatTime(c.created_at)}</span>
                            </div>
                            <p className="text-sm">{c.mensagem}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Form de envio */}
            <form onSubmit={handleSubmit} className="space-y-2">
                {erro && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                        {erro}
                    </div>
                )}

                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={novaMensagem}
                            onChange={(e) => setNovaMensagem(e.target.value.slice(0, 140))}
                            placeholder={chatBloqueado ? 'Chat desabilitado' : 'Digite sua sugestão...'}
                            disabled={chatBloqueado || enviando}
                            className="w-full px-4 py-2 pr-16 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all text-sm disabled:opacity-50"
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${novaMensagem.length > 120 ? 'text-yellow-400' : 'text-muted'
                            }`}>
                            {novaMensagem.length}/140
                        </span>
                    </div>
                    <button
                        type="submit"
                        disabled={chatBloqueado || enviando || !novaMensagem.trim()}
                        className="px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {enviando ? '...' : '➤'}
                    </button>
                </div>

                <p className="text-xs text-muted text-center">
                    🤖 Mensagens são moderadas por IA antes da publicação
                </p>
            </form>
        </div>
    )
}
