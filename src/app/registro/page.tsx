'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegistroPage() {
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const validateEmail = async (email: string): Promise<{ valid: boolean; message: string }> => {
        try {
            const response = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`)
            const data = await response.json()
            return { valid: data.authorized, message: data.message }
        } catch {
            // Fallback: verificar apenas @experian.com
            const isExperian = email.toLowerCase().endsWith('@experian.com')
            return {
                valid: isExperian,
                message: isExperian ? 'Email autorizado' : 'Apenas emails @experian.com são permitidos.'
            }
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Validações
        const emailValidation = await validateEmail(email)
        if (!emailValidation.valid) {
            setError(emailValidation.message)
            setLoading(false)
            return
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: nome,
                    },
                },
            })

            if (error) {
                setError(error.message)
            } else {
                setSuccess(true)
            }
        } catch {
            setError('Ocorreu um erro. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <main className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 py-12">
                <div className="decoration-orb orb-gold w-[400px] h-[400px] -top-32 -left-32 absolute opacity-20 animate-pulse-slow" />
                <div className="decoration-orb orb-red w-[300px] h-[300px] bottom-0 right-0 absolute opacity-15 animate-pulse-slow" />

                <div className="relative z-10 w-full max-w-md text-center">
                    <div className="glass rounded-3xl p-8">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Conta criada com sucesso!</h1>
                        <p className="text-muted mb-6">
                            Enviamos um email de confirmação para <strong className="text-white">{email}</strong>.
                            Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
                        </p>
                        <Link href="/login" className="btn-primary inline-block">
                            Ir para o Login
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 py-12">
            {/* Background decorations */}
            <div className="decoration-orb orb-gold w-[400px] h-[400px] -top-32 -left-32 absolute opacity-20 animate-pulse-slow" />
            <div className="decoration-orb orb-red w-[300px] h-[300px] bottom-0 right-0 absolute opacity-15 animate-pulse-slow" />

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                        <span className="text-2xl">🎲</span>
                    </div>
                    <span className="text-2xl font-bold text-gradient">Bolão GFT</span>
                </Link>

                {/* Register Card */}
                <div className="glass rounded-3xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold mb-2">Criar sua conta</h1>
                        <p className="text-muted">Junte-se ao bolão da empresa</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="nome" className="block text-sm font-medium mb-2">
                                Nome completo
                            </label>
                            <input
                                id="nome"
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Seu nome"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                         text-white placeholder:text-muted focus:outline-none focus:border-yellow-500
                         transition-colors"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2">
                                Email corporativo
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu.nome@experian.com"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                         text-white placeholder:text-muted focus:outline-none focus:border-yellow-500
                         transition-colors"
                            />
                            <p className="text-xs text-muted mt-1">
                                Emails autorizados pelo administrador
                            </p>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-2">
                                Senha
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                         text-white placeholder:text-muted focus:outline-none focus:border-yellow-500
                         transition-colors"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                                Confirmar senha
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Digite a senha novamente"
                                required
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 
                         text-white placeholder:text-muted focus:outline-none focus:border-yellow-500
                         transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>Criando conta...</span>
                                </>
                            ) : (
                                <span>Criar conta</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <p className="text-muted text-sm">
                            Já tem uma conta?{' '}
                            <Link href="/login" className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium">
                                Fazer login
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Back link */}
                <div className="mt-6 text-center">
                    <Link href="/" className="text-muted hover:text-white transition-colors text-sm inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar para a home
                    </Link>
                </div>
            </div>
        </main>
    )
}
