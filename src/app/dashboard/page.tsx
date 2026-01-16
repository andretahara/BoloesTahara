import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './LogoutButton'
import { isAdmin } from '@/lib/authorized-admins'
import EnquetesUserSection from './EnquetesUserSection'
import ComentariosDominio from './ComentariosDominio'
import AtualizacoesHomepage from '../components/AtualizacoesHomepage'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const userName = user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário'
    const userIsAdmin = isAdmin(user.email)

    // Buscar bolões abertos
    const { data: boloes } = await supabase
        .from('boloes')
        .select('*')
        .eq('status', 'aberto')
        .order('deadline', { ascending: true })
        .limit(3)

    // Buscar participações do usuário
    const { data: participacoes } = await supabase
        .from('participacoes')
        .select('*, boloes(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    // Calcular estatísticas
    const totalCotas = participacoes?.reduce((acc, p) => acc + p.quotas, 0) || 0
    const totalBoloes = participacoes?.length || 0

    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* Background decorations */}
            <div className="decoration-orb orb-gold w-[400px] h-[400px] -top-32 -right-32 absolute opacity-15 animate-pulse-slow" />
            <div className="decoration-orb orb-red w-[300px] h-[300px] bottom-0 left-0 absolute opacity-10 animate-pulse-slow" />

            {/* Header */}
            <header className="relative z-10 px-6 py-4 border-b border-white/10">
                <nav className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
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

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium">{userName}</p>
                            <p className="text-xs text-muted">{user.email}</p>
                        </div>
                        <LogoutButton />
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <div className="relative z-10 px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Welcome Section */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Olá, <span className="text-gradient">{userName}</span>! 👋
                        </h1>
                        <p className="text-muted">Bem-vindo ao seu painel de bolões</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                                    <span className="text-2xl">🎫</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalCotas}</p>
                                    <p className="text-sm text-muted">Cotas Ativas</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gold">R$ 0</p>
                                    <p className="text-sm text-muted">Prêmios Ganhos</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                                    <span className="text-2xl">🎲</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalBoloes}</p>
                                    <p className="text-sm text-muted">Bolões Participados</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Box de Atualizações IA */}
                    <div className="mb-8">
                        <AtualizacoesHomepage variant="dashboard" />
                    </div>

                    {/* Active Pools Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Bolões Disponíveis</h2>
                            <Link href="/boloes" className="text-yellow-400 hover:text-purple-300 text-sm">
                                Ver todos →
                            </Link>
                        </div>

                        {(!boloes || boloes.length === 0) ? (
                            <div className="glass rounded-2xl p-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/10 to-amber-600/10 flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">🎰</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2">Nenhum bolão disponível</h3>
                                <p className="text-muted mb-6 max-w-md mx-auto">
                                    Quando o administrador criar novos bolões, eles aparecerão aqui para você participar.
                                </p>
                                <button className="btn-secondary" disabled>
                                    Aguarde novos bolões
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {boloes.map((bolao) => {
                                    const hasQuotaLimit = bolao.total_quotas !== null
                                    const progressPercent = hasQuotaLimit ? (bolao.sold_quotas / bolao.total_quotas) * 100 : 0
                                    const remainingQuotas = hasQuotaLimit ? bolao.total_quotas - bolao.sold_quotas : null
                                    const deadline = new Date(bolao.deadline)
                                    const isExpiring = deadline.getTime() - Date.now() < 24 * 60 * 60 * 1000

                                    return (
                                        <Link
                                            key={bolao.id}
                                            href={`/boloes/${bolao.id}`}
                                            className="glass rounded-2xl p-6 hover:border-yellow-500/30 transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="font-bold text-lg group-hover:text-yellow-400 transition-colors">
                                                        {bolao.name}
                                                    </h3>
                                                    <p className="text-sm text-muted line-clamp-2 mt-1">
                                                        {bolao.description}
                                                    </p>
                                                </div>
                                                {isExpiring && (
                                                    <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                                                        ⏰ Expirando
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted">Valor da cota</span>
                                                    <span className="font-semibold text-gold">
                                                        R$ {parseFloat(bolao.quota_value).toFixed(2).replace('.', ',')}
                                                    </span>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between text-sm mb-2">
                                                        <span className="text-muted">
                                                            {hasQuotaLimit ? `${remainingQuotas} cotas disponíveis` : 'Sem limite de cotas'}
                                                        </span>
                                                        {hasQuotaLimit && <span className="text-muted">{progressPercent.toFixed(0)}%</span>}
                                                    </div>
                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full transition-all duration-500"
                                                            style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                                                    <span className="text-muted">📅 Prazo</span>
                                                    <span className="font-medium">
                                                        {deadline.toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            </div>

                                            <button className="btn-primary w-full mt-4 text-sm">
                                                Participar →
                                            </button>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* My Participations */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Minhas Participações</h2>
                        </div>

                        {(!participacoes || participacoes.length === 0) ? (
                            <div className="glass rounded-2xl p-8 text-center">
                                <p className="text-muted">
                                    Você ainda não participou de nenhum bolão.
                                    Que tal dar uma olhada nos bolões disponíveis?
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {participacoes.map((p) => (
                                    <div key={p.id} className="glass rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold">{p.boloes?.name || 'Bolão'}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.payment_status === 'confirmado'
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                        }`}>
                                                        {p.payment_status === 'confirmado' ? '✅ Pago' : '⏳ Pendente'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted">
                                                    <span>🎫 {p.quotas} {p.quotas === 1 ? 'cota' : 'cotas'}</span>
                                                    <span>💰 R$ {(p.quotas * parseFloat(p.boloes?.quota_value || 0)).toFixed(2).replace('.', ',')}</span>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/boloes/${p.bolao_id}`}
                                                className="text-yellow-400 hover:text-purple-300 text-sm"
                                            >
                                                Ver bolão →
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Enquetes e Comentários Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        <EnquetesUserSection userEmail={user.email || ''} />
                        <ComentariosDominio userEmail={user.email || ''} userName={userName} />
                    </div>
                </div>
            </div>
        </main>
    )
}
