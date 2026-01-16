import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/authorized-admins'

export default async function BoloesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const userName = user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuário'
    const userIsAdmin = isAdmin(user.email)

    // Buscar todos os bolões
    const { data: boloes } = await supabase
        .from('boloes')
        .select('*')
        .order('status', { ascending: true })
        .order('deadline', { ascending: true })

    const boloesAbertos = boloes?.filter(b => b.status === 'aberto') || []
    const boloesFechados = boloes?.filter(b => b.status === 'fechado') || []
    const boloesSorteados = boloes?.filter(b => b.status === 'sorteado') || []

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

                    <Link href="/dashboard" className="text-muted hover:text-white transition-colors text-sm inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Voltar ao dashboard
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <div className="relative z-10 px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Page Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Todos os <span className="text-gradient">Bolões</span> 🎰
                        </h1>
                        <p className="text-muted">Confira todos os bolões disponíveis e participe!</p>
                    </div>

                    {/* Bolões Abertos */}
                    <section className="mb-12">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            Bolões Abertos ({boloesAbertos.length})
                        </h2>

                        {boloesAbertos.length === 0 ? (
                            <div className="glass rounded-2xl p-8 text-center">
                                <span className="text-4xl block mb-4">😴</span>
                                <p className="text-muted">Nenhum bolão aberto no momento</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {boloesAbertos.map((bolao) => {
                                    const progressPercent = (bolao.sold_quotas / bolao.total_quotas) * 100
                                    const remainingQuotas = bolao.total_quotas - bolao.sold_quotas
                                    const deadline = new Date(bolao.deadline)

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
                                                        <span className="text-muted">{remainingQuotas} cotas disponíveis</span>
                                                        <span className="text-muted">{progressPercent.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full"
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
                    </section>

                    {/* Bolões Fechados */}
                    {boloesFechados.length > 0 && (
                        <section className="mb-12">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                Bolões Fechados ({boloesFechados.length})
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {boloesFechados.map((bolao) => (
                                    <Link
                                        key={bolao.id}
                                        href={`/boloes/${bolao.id}`}
                                        className="glass rounded-2xl p-6 opacity-80 hover:opacity-100 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold">{bolao.name}</h3>
                                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                                                🔒 Fechado
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted line-clamp-2 mb-4">{bolao.description}</p>
                                        <div className="text-sm text-muted">
                                            💰 R$ {parseFloat(bolao.quota_value).toFixed(2).replace('.', ',')} •
                                            🎫 {bolao.sold_quotas} cotas vendidas
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Bolões Sorteados */}
                    {boloesSorteados.length > 0 && (
                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                Bolões Sorteados ({boloesSorteados.length})
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {boloesSorteados.map((bolao) => (
                                    <Link
                                        key={bolao.id}
                                        href={`/boloes/${bolao.id}`}
                                        className="glass rounded-2xl p-6 opacity-70 hover:opacity-100 transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-bold">{bolao.name}</h3>
                                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                                                🏆 Sorteado
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted line-clamp-2 mb-4">{bolao.description}</p>
                                        <div className="text-sm text-muted">
                                            💰 Total: R$ {(bolao.sold_quotas * parseFloat(bolao.quota_value)).toFixed(2).replace('.', ',')}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    )
}
