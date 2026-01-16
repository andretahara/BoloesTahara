'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface EmailAutorizado {
    tipo: 'email' | 'dominio'
    valor: string
    descricao: string | null
}

export default function CreateEnqueteForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [dominiosDisponiveis, setDominiosDisponiveis] = useState<string[]>([])
    const [dominiosSelecionados, setDominiosSelecionados] = useState<string[]>([])

    const [formData, setFormData] = useState({
        titulo: '',
        descricao: '',
        opcoes: ['', ''],
        data_fim: ''
    })

    const supabase = createClient()

    useEffect(() => {
        async function loadDominios() {
            const { data } = await supabase
                .from('emails_autorizados')
                .select('tipo, valor, descricao')
                .eq('tipo', 'dominio')
                .eq('ativo', true)

            if (data) {
                setDominiosDisponiveis(data.map((d: EmailAutorizado) => d.valor))
            }
        }
        loadDominios()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleOpcaoChange = (index: number, value: string) => {
        const novasOpcoes = [...formData.opcoes]
        novasOpcoes[index] = value
        setFormData({ ...formData, opcoes: novasOpcoes })
    }

    const addOpcao = () => {
        if (formData.opcoes.length < 6) {
            setFormData({ ...formData, opcoes: [...formData.opcoes, ''] })
        }
    }

    const removeOpcao = (index: number) => {
        if (formData.opcoes.length > 2) {
            const novasOpcoes = formData.opcoes.filter((_, i) => i !== index)
            setFormData({ ...formData, opcoes: novasOpcoes })
        }
    }

    const handleDominioToggle = (dominio: string) => {
        if (dominiosSelecionados.includes(dominio)) {
            setDominiosSelecionados(dominiosSelecionados.filter(d => d !== dominio))
        } else {
            setDominiosSelecionados([...dominiosSelecionados, dominio])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess(false)

        // Validar opções
        const opcoesValidas = formData.opcoes.filter(o => o.trim() !== '')
        if (opcoesValidas.length < 2) {
            setError('Adicione pelo menos 2 opções de resposta')
            setLoading(false)
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setError('Você precisa estar logado')
                return
            }

            // Formatar opções como JSONB
            const opcoesJson = opcoesValidas.map((texto, idx) => ({
                id: String(idx + 1),
                texto
            }))

            const { error: insertError } = await supabase
                .from('enquetes')
                .insert({
                    titulo: formData.titulo,
                    descricao: formData.descricao || null,
                    opcoes: opcoesJson,
                    dominios_alvo: dominiosSelecionados.length > 0 ? dominiosSelecionados : [],
                    data_fim: new Date(formData.data_fim).toISOString(),
                    created_by: user.id,
                    status: 'ativa'
                })

            if (insertError) {
                console.error('Insert error:', insertError)
                setError(insertError.message)
                return
            }

            setSuccess(true)
            setFormData({
                titulo: '',
                descricao: '',
                opcoes: ['', ''],
                data_fim: ''
            })
            setDominiosSelecionados([])
            router.refresh()
        } catch (err) {
            console.error('Error creating enquete:', err)
            setError('Erro ao criar enquete. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const minDate = tomorrow.toISOString().split('T')[0]

    return (
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
                📊 Criar Nova Enquete
            </h3>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                    ✅ Enquete criada com sucesso!
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-2">Título da Enquete *</label>
                <input
                    type="text"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleChange}
                    placeholder="Ex: Qual sorteio você prefere?"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
                <textarea
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    placeholder="Descreva a enquete..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none"
                />
            </div>

            {/* Opções */}
            <div>
                <label className="block text-sm font-medium mb-2">Opções de Resposta *</label>
                <div className="space-y-2">
                    {formData.opcoes.map((opcao, index) => (
                        <div key={index} className="flex gap-2">
                            <input
                                type="text"
                                value={opcao}
                                onChange={(e) => handleOpcaoChange(index, e.target.value)}
                                placeholder={`Opção ${index + 1}`}
                                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all text-sm"
                            />
                            {formData.opcoes.length > 2 && (
                                <button
                                    type="button"
                                    onClick={() => removeOpcao(index)}
                                    className="px-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {formData.opcoes.length < 6 && (
                    <button
                        type="button"
                        onClick={addOpcao}
                        className="mt-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                        + Adicionar opção
                    </button>
                )}
            </div>

            {/* Domínios */}
            {dominiosDisponiveis.length > 0 && (
                <div>
                    <label className="block text-sm font-medium mb-2">Domínios Alvo (opcional)</label>
                    <p className="text-xs text-muted mb-2">
                        Selecione quais domínios receberão esta enquete. Se nenhum for selecionado, todos verão.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {dominiosDisponiveis.map(dominio => (
                            <button
                                key={dominio}
                                type="button"
                                onClick={() => handleDominioToggle(dominio)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${dominiosSelecionados.includes(dominio)
                                        ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                                        : 'bg-white/5 text-muted border border-white/10 hover:border-white/20'
                                    }`}
                            >
                                {dominio}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-2">Data de Encerramento *</label>
                <input
                    type="date"
                    name="data_fim"
                    value={formData.data_fim}
                    onChange={handleChange}
                    min={minDate}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Criando...
                    </span>
                ) : (
                    <>📊 Criar Enquete</>
                )}
            </button>
        </form>
    )
}
