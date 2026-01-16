'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Log {
    id: string
    categoria: 'aplicacao' | 'ia' | 'banco' | 'usuario' | 'outro'
    nivel: 'debug' | 'info' | 'warning' | 'error' | 'critical'
    mensagem: string
    detalhes: Record<string, unknown> | null
    usuario_email: string | null
    created_at: string
}

const CATEGORIAS = [
    { id: 'aplicacao', label: '🖥️ Aplicação', color: 'blue' },
    { id: 'ia', label: '🤖 IA', color: 'purple' },
    { id: 'banco', label: '🗄️ Banco de Dados', color: 'green' },
    { id: 'usuario', label: '👤 Usuários', color: 'amber' },
    { id: 'outro', label: '📝 Outros', color: 'gray' },
]

const NIVEIS_CORES: Record<string, string> = {
    debug: 'text-gray-400 bg-gray-500/10',
    info: 'text-blue-400 bg-blue-500/10',
    warning: 'text-yellow-400 bg-yellow-500/10',
    error: 'text-red-400 bg-red-500/10',
    critical: 'text-red-500 bg-red-500/20 font-bold',
}

export default function LogsViewer() {
    const [logs, setLogs] = useState<Record<string, Log[]>>({
        aplicacao: [],
        ia: [],
        banco: [],
        usuario: [],
        outro: [],
    })
    const [loading, setLoading] = useState(true)
    const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)
    const supabase = createClient()

    useEffect(() => {
        carregarLogs()
    }, [])

    async function carregarLogs() {
        setLoading(true)

        const { data: logsData } = await supabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500)

        if (logsData) {
            const logsPorCategoria: Record<string, Log[]> = {
                aplicacao: [],
                ia: [],
                banco: [],
                usuario: [],
                outro: [],
            }

            logsData.forEach((log: Log) => {
                if (logsPorCategoria[log.categoria]) {
                    logsPorCategoria[log.categoria].push(log)
                }
            })

            setLogs(logsPorCategoria)
        }

        setLoading(false)
    }

    async function limparLogs(categoria: string) {
        if (!confirm(`Tem certeza que deseja limpar todos os logs de "${categoria}"?`)) {
            return
        }

        await supabase
            .from('system_logs')
            .delete()
            .eq('categoria', categoria)

        setLogs({ ...logs, [categoria]: [] })
    }

    function formatarData(data: string) {
        return new Date(data).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Tabs de Categorias */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setCategoriaAtiva(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${categoriaAtiva === null
                            ? 'bg-amber-500 text-black'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                >
                    📊 Todos
                </button>
                {CATEGORIAS.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setCategoriaAtiva(cat.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${categoriaAtiva === cat.id
                                ? 'bg-amber-500 text-black'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        {cat.label}
                        <span className="px-1.5 py-0.5 rounded bg-black/20 text-xs">
                            {logs[cat.id]?.length || 0}
                        </span>
                    </button>
                ))}

                <button
                    onClick={carregarLogs}
                    className="ml-auto px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                    🔄 Atualizar
                </button>
            </div>

            {/* Caixas de Logs */}
            <div className={`grid gap-6 ${categoriaAtiva ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {CATEGORIAS.filter(cat => !categoriaAtiva || categoriaAtiva === cat.id).map(cat => (
                    <div key={cat.id} className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/50 flex items-center justify-between">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                {cat.label}
                                <span className="text-xs text-gray-400">
                                    ({logs[cat.id]?.length || 0} logs)
                                </span>
                            </h3>
                            {logs[cat.id]?.length > 0 && (
                                <button
                                    onClick={() => limparLogs(cat.id)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    🗑️ Limpar
                                </button>
                            )}
                        </div>

                        {/* Lista de Logs */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {logs[cat.id]?.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <span className="text-3xl block mb-2">📭</span>
                                    Nenhum log nesta categoria
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-800">
                                    {logs[cat.id]?.slice(0, 50).map(log => (
                                        <div key={log.id} className="p-3 hover:bg-gray-800/30 transition-colors">
                                            <div className="flex items-start gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs uppercase ${NIVEIS_CORES[log.nivel]}`}>
                                                    {log.nivel}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-200 break-words">
                                                        {log.mensagem}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                                        <span>{formatarData(log.created_at)}</span>
                                                        {log.usuario_email && (
                                                            <span className="truncate">👤 {log.usuario_email}</span>
                                                        )}
                                                    </div>
                                                    {log.detalhes && (
                                                        <details className="mt-2">
                                                            <summary className="text-xs text-amber-400/70 cursor-pointer hover:text-amber-400">
                                                                Ver detalhes
                                                            </summary>
                                                            <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-gray-400 overflow-x-auto">
                                                                {JSON.stringify(log.detalhes, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Nota sobre logs vazios */}
            {Object.values(logs).every(arr => arr.length === 0) && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center">
                    <span className="text-3xl block mb-3">📋</span>
                    <h3 className="text-lg font-semibold text-amber-400 mb-2">Nenhum log registrado ainda</h3>
                    <p className="text-gray-400 text-sm">
                        Os logs serão registrados automaticamente conforme o sistema for utilizado.
                        Execute um agente de IA ou realize ações no sistema para gerar logs.
                    </p>
                </div>
            )}
        </div>
    )
}
