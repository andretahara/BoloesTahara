import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/authorized-admins'
import ParticiparForm from './ParticiparForm'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function BolaoPage({ params }: PageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const userName = user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário'
    const userIsAdmin = isAdmin(user.email)

    // Buscar bolão
    const { data: bolao, error } = await supabase
        .from('boloes')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !bolao) {
        notFound()
    }

    // Verificar se usuário já participa
    const { data: participacao } = await supabase
        .from('participacoes')
        .select('*')
        .eq('bolao_id', id)
        .eq('user_id', user.id)
        .single()

    // Calcular progresso: se tem limite de cotas usa cotas, senão usa tempo
    const hasQuotaLimit = bolao.total_quotas !== null
    const deadline = new Date(bolao.deadline)
    const created = new Date(bolao.created_at)
    const now = new Date()

    let progressPercent: number
    let progressLabel: string

    if (hasQuotaLimit) {
        // Progresso baseado em cotas
        progressPercent = (bolao.sold_quotas / bolao.total_quotas) * 100
        progressLabel = 'Progresso das Cotas'
    } else {
        // Progresso baseado em tempo
        const totalTime = deadline.getTime() - created.getTime()
        const elapsedTime = now.getTime() - created.getTime()
        progressPercent = Math.min((elapsedTime / totalTime) * 100, 100)
        progressLabel = 'Tempo Restante'
    }

    const remainingQuotas = hasQuotaLimit ? bolao.total_quotas - bolao.sold_quotas : null
    const totalPrize = bolao.sold_quotas * parseFloat(bolao.quota_value)
    const isExpired = deadline < new Date()
    const isClosed = bolao.status !== 'aberto'
    const isFull = hasQuotaLimit && remainingQuotas === 0
    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* Background decorations */}
            <div className="decoration-orb orb-purple w-[400px] h-[400px] -top-32 -right-32 absolute opacity-20 animate-pulse-slow" />
            <div className="decoration-orb orb-gold w-[300px] h-[300px] bottom-0 left-0 absolute opacity-15 animate-pulse-slow" />

            {/* Header */}
            <header className="relative z-10 px-6 py-4 border-b border-white/10">
                <nav className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                <span className="text-xl">🎲</span>
                            </div>
                            <span className="text-xl font-bold text-gradient">Bolão GFT</span>
                        </Link>
                        {userIsAdmin && (
                            <Link
                                href="/admin"
                                className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold hover:from-yellow-500/30 hover:to-orange-500/30 transition-all"
                            >
                                ⚙️ Admin
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-muted hover:text-white transition-colors text-sm inline-flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Voltar ao dashboard
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <div className="relative z-10 px-6 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Bolão Card */}
                    <div className="glass rounded-3xl p-8 mb-8">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-bold">{bolao.name}</h1>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${bolao.status === 'aberto'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : bolao.status === 'fechado'
                                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        }`}>
                                        {bolao.status === 'aberto' ? '🟢 Aberto' : bolao.status === 'fechado' ? '🔒 Fechado' : '🏆 Sorteado'}
                                    </span>
                                </div>
                                <p className="text-muted max-w-xl">{bolao.description}</p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-gold">
                                    R$ {parseFloat(bolao.quota_value).toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-xs text-muted mt-1">Valor da Cota</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold">{hasQuotaLimit ? remainingQuotas : '∞'}</p>
                                <p className="text-xs text-muted mt-1">{hasQuotaLimit ? 'Cotas Disponíveis' : 'Sem Limite'}</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-purple-400">
                                    R$ {totalPrize.toFixed(2).replace('.', ',')}
                                </p>
                                <p className="text-xs text-muted mt-1">Prêmio Atual</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold">{bolao.sold_quotas}</p>
                                <p className="text-xs text-muted mt-1">Participantes</p>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted">{progressLabel}</span>
                                <span className="text-sm font-medium">
                                    {hasQuotaLimit ? `${progressPercent.toFixed(1)}%` : `${Math.max(100 - progressPercent, 0).toFixed(0)}% restante`}
                                </span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Deadline */}
                        <div className="flex items-center gap-2 mb-8 p-4 bg-white/5 rounded-xl">
                            <span className="text-2xl">📅</span>
                            <div>
                                <p className="font-medium">Prazo para participar</p>
                                <p className="text-sm text-muted">
                                    {deadline.toLocaleDateString('pt-BR', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })} às {deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>

                        {/* Participação Form ou Status */}
                        {participacao ? (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-2xl">✅</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-green-400 mb-1">Você já está participando!</h3>
                                        <p className="text-muted mb-4">
                                            Você adquiriu <strong className="text-white">{participacao.quotas} {participacao.quotas === 1 ? 'cota' : 'cotas'}</strong> neste bolão.
                                        </p>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="flex items-center gap-2">
                                                <span className="text-muted">💰 Total:</span>
                                                <span className="font-semibold">
                                                    R$ {(participacao.quotas * parseFloat(bolao.quota_value)).toFixed(2).replace('.', ',')}
                                                </span>
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${participacao.payment_status === 'confirmado'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {participacao.payment_status === 'confirmado' ? '✅ Pagamento confirmado' : '⏳ Pagamento pendente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isClosed || isExpired ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 text-center">
                                <span className="text-3xl mb-4 block">{isExpired ? '⏰' : '🔒'}</span>
                                <h3 className="font-bold text-lg text-yellow-400 mb-2">
                                    {isExpired ? 'Prazo encerrado' : 'Inscrições fechadas'}
                                </h3>
                                <p className="text-muted">
                                    {isExpired
                                        ? 'O prazo para participar deste bolão já passou.'
                                        : 'Este bolão não está mais aceitando novas participações.'
                                    }
                                </p>
                            </div>
                        ) : isFull ? (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6 text-center">
                                <span className="text-3xl mb-4 block">🎫</span>
                                <h3 className="font-bold text-lg text-purple-400 mb-2">Todas as cotas vendidas!</h3>
                                <p className="text-muted">
                                    Este bolão atingiu o limite de cotas. Fique de olho nos próximos!
                                </p>
                            </div>
                        ) : (
                            <ParticiparForm
                                bolaoId={bolao.id}
                                quotaValue={parseFloat(bolao.quota_value)}
                                maxQuotas={hasQuotaLimit ? Math.min(remainingQuotas as number, 10) : 10}
                                userId={user.id}
                                userEmail={user.email || ''}
                                userName={userName}
                            />
                        )}
                    </div>

                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass rounded-xl p-4 text-center">
                            <span className="text-2xl block mb-2">🎲</span>
                            <h3 className="font-semibold mb-1">Sorteio Justo</h3>
                            <p className="text-xs text-muted">Sorteio realizado de forma transparente</p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <span className="text-2xl block mb-2">💳</span>
                            <h3 className="font-semibold mb-1">Pagamento PIX</h3>
                            <p className="text-xs text-muted">Confirme via PIX com o administrador</p>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <span className="text-2xl block mb-2">🏆</span>
                            <h3 className="font-semibold mb-1">Prêmio Garantido</h3>
                            <p className="text-xs text-muted">100% do valor arrecadado para o vencedor</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
