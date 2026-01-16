'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EmailAutorizado {
    id: string
    tipo: 'email' | 'dominio'
    valor: string
    descricao: string | null
    ativo: boolean
    created_at: string
}

export default function EmailsAutorizadosManager() {
    const [emails, setEmails] = useState<EmailAutorizado[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [newEntry, setNewEntry] = useState({
        tipo: 'email' as 'email' | 'dominio',
        valor: '',
        descricao: ''
    })

    const supabase = createClient()

    const loadEmails = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('emails_autorizados')
            .select('*')
            .order('tipo')
            .order('valor')

        if (error) {
            setError('Erro ao carregar emails autorizados')
            console.error(error)
        } else {
            setEmails(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        loadEmails()
    }, [])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSaving(true)

        let valor = newEntry.valor.trim().toLowerCase()

        // Adicionar @ se for domínio e não tiver
        if (newEntry.tipo === 'dominio' && !valor.startsWith('@')) {
            valor = '@' + valor
        }

        const { error } = await supabase
            .from('emails_autorizados')
            .insert({
                tipo: newEntry.tipo,
                valor: valor,
                descricao: newEntry.descricao || null
            })

        if (error) {
            if (error.message.includes('duplicate')) {
                setError('Este email/domínio já está cadastrado')
            } else {
                setError('Erro ao adicionar: ' + error.message)
            }
        } else {
            setSuccess('Adicionado com sucesso!')
            setNewEntry({ tipo: 'email', valor: '', descricao: '' })
            loadEmails()
        }
        setSaving(false)
    }

    const handleToggle = async (id: string, ativo: boolean) => {
        const { error } = await supabase
            .from('emails_autorizados')
            .update({ ativo: !ativo })
            .eq('id', id)

        if (error) {
            setError('Erro ao atualizar')
        } else {
            loadEmails()
        }
    }

    const handleDelete = async (id: string, valor: string) => {
        if (!confirm(`Tem certeza que deseja remover "${valor}"?`)) return

        const { error } = await supabase
            .from('emails_autorizados')
            .delete()
            .eq('id', id)

        if (error) {
            setError('Erro ao remover')
        } else {
            setSuccess('Removido com sucesso!')
            loadEmails()
        }
    }

    return (
        <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                📧 Emails Autorizados para Registro
            </h3>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm mb-4">
                    {success}
                </div>
            )}

            {/* Form to add new */}
            <form onSubmit={handleAdd} className="mb-6 p-4 bg-white/5 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs text-muted mb-1">Tipo</label>
                        <select
                            value={newEntry.tipo}
                            onChange={(e) => setNewEntry({ ...newEntry, tipo: e.target.value as 'email' | 'dominio' })}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-yellow-500/50 focus:outline-none"
                        >
                            <option value="email">Email específico</option>
                            <option value="dominio">Domínio (@...)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">
                            {newEntry.tipo === 'email' ? 'Email' : 'Domínio (ex: @empresa.com)'}
                        </label>
                        <input
                            type="text"
                            value={newEntry.valor}
                            onChange={(e) => setNewEntry({ ...newEntry, valor: e.target.value })}
                            placeholder={newEntry.tipo === 'email' ? 'usuario@email.com' : '@empresa.com'}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-yellow-500/50 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted mb-1">Descrição (opcional)</label>
                        <input
                            type="text"
                            value={newEntry.descricao}
                            onChange={(e) => setNewEntry({ ...newEntry, descricao: e.target.value })}
                            placeholder="Ex: Admin, Parceiro..."
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-yellow-500/50 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full px-4 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 
                                       hover:bg-yellow-500/30 transition-all text-sm font-medium disabled:opacity-50"
                        >
                            {saving ? '...' : '+ Adicionar'}
                        </button>
                    </div>
                </div>
            </form>

            {/* List */}
            {loading ? (
                <div className="text-center py-8 text-muted">Carregando...</div>
            ) : emails.length === 0 ? (
                <div className="text-center py-8 text-muted">
                    Nenhum email/domínio cadastrado
                </div>
            ) : (
                <div className="space-y-2">
                    {emails.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${item.ativo
                                    ? 'bg-white/5 border-white/10'
                                    : 'bg-white/2 border-white/5 opacity-60'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.tipo === 'dominio'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-green-500/20 text-green-400'
                                    }`}>
                                    {item.tipo === 'dominio' ? '🌐 Domínio' : '📧 Email'}
                                </span>
                                <span className="font-mono text-sm">{item.valor}</span>
                                {item.descricao && (
                                    <span className="text-xs text-muted">({item.descricao})</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleToggle(item.id, item.ativo)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${item.ativo
                                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        }`}
                                >
                                    {item.ativo ? 'Desativar' : 'Ativar'}
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id, item.valor)}
                                    className="px-3 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                >
                                    Remover
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-muted mt-4">
                💡 Adicione domínios (ex: @empresa.com) para permitir todos os emails desse domínio,
                ou emails específicos (ex: usuario@gmail.com) para exceções individuais.
            </p>
        </div>
    )
}
