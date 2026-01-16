'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CreateBolaoForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [hasQuotaLimit, setHasQuotaLimit] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        quota_value: '10.00',
        total_quotas: '100',
        deadline: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess(false)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                setError('Você precisa estar logado')
                return
            }

            const { error: insertError } = await supabase
                .from('boloes')
                .insert({
                    name: formData.name,
                    description: formData.description,
                    quota_value: parseFloat(formData.quota_value),
                    total_quotas: hasQuotaLimit ? parseInt(formData.total_quotas) : null,
                    deadline: new Date(formData.deadline).toISOString(),
                    created_by: user.id,
                    status: 'aberto'
                })

            if (insertError) {
                console.error('Insert error:', insertError)
                setError(insertError.message)
                return
            }

            setSuccess(true)
            setFormData({
                name: '',
                description: '',
                quota_value: '10.00',
                total_quotas: '100',
                deadline: ''
            })
            setHasQuotaLimit(false)

            // Refresh the page to show new bolão
            router.refresh()
        } catch (err) {
            console.error('Error creating bolão:', err)
            setError('Erro ao criar bolão. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    // Get tomorrow's date for min deadline
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const minDate = tomorrow.toISOString().split('T')[0]

    return (
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                    ✅ Bolão criado com sucesso!
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-2">Nome do Bolão *</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ex: Mega-Sena da Virada 2026"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descreva o bolão..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Valor da Cota (R$) *</label>
                <input
                    type="number"
                    name="quota_value"
                    value={formData.quota_value}
                    onChange={handleChange}
                    step="0.01"
                    min="1"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">Data Limite para Aquisição *</label>
                <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    min={minDate}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
                />
                <p className="text-xs text-muted mt-1">
                    Após esta data, não será possível adquirir novas cotas
                </p>
            </div>

            {/* Limite de Cotas Opcional */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={hasQuotaLimit}
                        onChange={(e) => setHasQuotaLimit(e.target.checked)}
                        className="w-5 h-5 rounded bg-white/10 border-white/20 text-yellow-500 focus:ring-yellow-500/20"
                    />
                    <div>
                        <span className="font-medium">Definir limite de cotas</span>
                        <p className="text-xs text-muted">
                            Opcional: defina um número máximo de cotas disponíveis
                        </p>
                    </div>
                </label>

                {hasQuotaLimit && (
                    <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">Total de Cotas</label>
                        <input
                            type="number"
                            name="total_quotas"
                            value={formData.total_quotas}
                            onChange={handleChange}
                            min="1"
                            max="10000"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-yellow-500/50 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
                        />
                    </div>
                )}
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
                    <>🎰 Criar Bolão</>
                )}
            </button>
        </form>
    )
}

