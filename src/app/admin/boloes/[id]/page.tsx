import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/authorized-admins'
import BolaoActions from './BolaoActions'
import ParticipacoesList from './ParticipacoesList'
import ImportExtratoButton from './ImportExtratoButton'
import TransacoesImportadasList from './TransacoesImportadasList'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function BolaoDetailPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    if (!isAdmin(user.email)) {
        redirect('/dashboard')
    }

    // Buscar bolão
    const { data: bolao, error } = await supabase
        .from('boloes')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !bolao) {
        notFound()
    }

    // Buscar participações
    const { data: participacoes } = await supabase
        .from('participacoes')
        .select('*')
        .eq('bolao_id', id)
        .order('created_at', { ascending: false })

    const totalArrecadado = bolao.sold_quotas * parseFloat(bolao.quota_value)
    const progressPercent = bolao.total_quotas ? (bolao.sold_quotas / bolao.total_quotas) * 100 : 0
    const hasQuotaLimit = bolao.total_quotas !== null
    const totalConfirmado = participacoes?.filter(p => p.payment_status === 'confirmado')
        .reduce((acc, p) => acc + (p.quotas * parseFloat(bolao.quota_value)), 0) || 0

    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* Background decorations */}
            <div className="decoration-orb orb-purple w-[400px] h-[400px] -top-32 -right-32 absolute opacity-20 animate-pulse-slow" />
            <div className="decoration-orb orb-gold w-[300px] h-[300px] bottom-0 left-0 absolute opacity-15 animate-pulse-slow" />

            {/* Header */}
            <header className="relative z-10 px-6 py-4 border-b border-white/10">
                <nav className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <span className="text-xl">🎲</span>
                            </div>
                            <span className="text-xl font-bold text-gradient">Bolão GFT</span>
                        </Link>
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold">
                            Admin
                        </span>
                    </div>

                    <Link href="/admin" className="text-muted hover:text-white transition-colors text-sm inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar ao painel
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <div className="relative z-10 px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Bolão Header */}
                    <div className="glass rounded-2xl p-6 mb-8">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold">{bolao.name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${bolao.status === 'aberto'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : bolao.status === 'fechado'
                                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        }`}>
                                        {bolao.status.charAt(0).toUpperCase() + bolao.status.slice(1)}
                                    </span>
                                </div>
                                <p className="text-muted mb-4">{bolao.description}</p>
                                <div className="flex flex-wrap gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted">💰 Valor da cota:</span>
                                        <span className="font-semibold">R$ {parseFloat(bolao.quota_value).toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted">📅 Prazo:</span>
                                        <span className="font-semibold">{new Date(bolao.deadline).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted">🕐 Horário:</span>
                                        <span className="font-semibold">{new Date(bolao.deadline).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                            <BolaoActions bolaoId={bolao.id} status={bolao.status} />
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-700/20 flex items-center justify-center">
                                    <span className="text-2xl">🎫</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{bolao.sold_quotas}{bolao.total_quotas ? `/${bolao.total_quotas}` : ''}</p>
                                    <p className="text-sm text-muted">Cotas Vendidas</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gold">R$ {totalArrecadado.toFixed(2).replace('.', ',')}</p>
                                    <p className="text-sm text-muted">Total do Bolão</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-green-400">R$ {totalConfirmado.toFixed(2).replace('.', ',')}</p>
                                    <p className="text-sm text-muted">Pagamentos Confirmados</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                    <span className="text-2xl">👥</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{participacoes?.length || 0}</p>
                                    <p className="text-sm text-muted">Participantes</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="glass rounded-2xl p-6 mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-medium">Progresso das Cotas</span>
                            <div className="flex items-center gap-3">
                                <ImportExtratoButton
                                    bolaoId={bolao.id}
                                    valorCota={parseFloat(bolao.quota_value)}
                                    status={bolao.status}
                                />
                                <span className="text-sm text-muted">{progressPercent.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                        </div>
                        <p className="text-sm text-muted mt-2">
                            {bolao.total_quotas ? `${bolao.total_quotas - bolao.sold_quotas} cotas disponíveis` : 'Sem limite de cotas'}
                        </p>
                    </div>

                    {/* Participations List */}
                    <div>
                        <h2 className="text-xl font-bold mb-4">Participantes</h2>
                        <ParticipacoesList
                            participacoes={participacoes || []}
                            quotaValue={parseFloat(bolao.quota_value)}
                            bolaoId={bolao.id}
                        />
                    </div>

                    {/* Transações Importadas */}
                    <div className="mt-8">
                        <TransacoesImportadasList bolaoId={bolao.id} />
                    </div>
                </div>
            </div>
        </main>
    )
}
