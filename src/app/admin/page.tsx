import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/authorized-admins'
import AdminLogoutButton from './AdminLogoutButton'
import CreateBolaoForm from './CreateBolaoForm'
import EmailsAutorizadosManager from './EmailsAutorizadosManager'
import CreateEnqueteForm from './CreateEnqueteForm'
import EnquetesAdminList from './EnquetesAdminList'
import ComentariosAdminPanel from './ComentariosAdminPanel'
import AgentesIAManager from './AgentesIAManager'

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verificar se é admin
    if (!isAdmin(user.email)) {
        redirect('/dashboard')
    }

    // Buscar bolões
    const { data: boloes, error } = await supabase
        .from('boloes')
        .select('*')
        .order('created_at', { ascending: false })

    // Estatísticas
    const totalBoloes = boloes?.length || 0
    const boloesAtivos = boloes?.filter(b => b.status === 'aberto').length || 0
    const totalArrecadado = boloes?.reduce((acc, b) => acc + (b.sold_quotas * parseFloat(b.quota_value)), 0) || 0

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
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold">
                            Admin
                        </span>
                        <Link
                            href="/admin/logs"
                            className="px-3 py-1 rounded-full bg-gray-700/50 border border-gray-600/30 text-gray-300 text-sm hover:bg-gray-600/50 transition-colors flex items-center gap-1"
                        >
                            📋 Logs
                        </Link>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium">{user.email}</p>
                            <p className="text-xs text-muted">Administrador</p>
                        </div>
                        <AdminLogoutButton />
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <div className="relative z-10 px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            Painel <span className="text-gradient">Administrativo</span> ⚙️
                        </h1>
                        <p className="text-muted">Gerencie todos os bolões da plataforma</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 flex items-center justify-center">
                                    <span className="text-2xl">🎰</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalBoloes}</p>
                                    <p className="text-sm text-muted">Total de Bolões</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-green-400">{boloesAtivos}</p>
                                    <p className="text-sm text-muted">Bolões Ativos</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                                    <span className="text-2xl">💰</span>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gold">
                                        R$ {totalArrecadado.toFixed(2).replace('.', ',')}
                                    </p>
                                    <p className="text-sm text-muted">Total Arrecadado</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Create New Bolão */}
                        <div>
                            <h2 className="text-xl font-bold mb-4">Criar Novo Bolão</h2>
                            <CreateBolaoForm />
                        </div>

                        {/* Bolões List */}
                        <div>
                            <h2 className="text-xl font-bold mb-4">Bolões Criados</h2>
                            <div className="space-y-4">
                                {(!boloes || boloes.length === 0) ? (
                                    <div className="glass rounded-2xl p-8 text-center">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500/10 to-amber-600/10 flex items-center justify-center mx-auto mb-4">
                                            <span className="text-3xl">📋</span>
                                        </div>
                                        <p className="text-muted">Nenhum bolão criado ainda</p>
                                        <p className="text-sm text-muted mt-2">Use o formulário ao lado para criar o primeiro!</p>
                                    </div>
                                ) : (
                                    boloes.map((bolao) => (
                                        <div key={bolao.id} className="glass rounded-xl p-4 hover:border-yellow-500/30 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold">{bolao.name}</h3>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bolao.status === 'aberto'
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                            : bolao.status === 'fechado'
                                                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                            }`}>
                                                            {bolao.status.charAt(0).toUpperCase() + bolao.status.slice(1)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted mb-2 line-clamp-1">{bolao.description}</p>
                                                    <div className="flex items-center gap-4 text-xs text-muted">
                                                        <span className="flex items-center gap-1">
                                                            💰 R$ {parseFloat(bolao.quota_value).toFixed(2).replace('.', ',')}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            🎫 {bolao.sold_quotas}{bolao.total_quotas ? `/${bolao.total_quotas}` : ''} cotas
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            📅 {new Date(bolao.deadline).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/admin/boloes/${bolao.id}`}
                                                    className="text-yellow-400 hover:text-yellow-300 text-sm whitespace-nowrap ml-4"
                                                >
                                                    Ver detalhes →
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Email Management Section */}
                    <div className="mt-8">
                        <EmailsAutorizadosManager />
                    </div>

                    {/* Enquetes Section */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <CreateEnqueteForm />
                        <EnquetesAdminList />
                    </div>

                    {/* Comentários Section */}
                    <div className="mt-8">
                        <ComentariosAdminPanel />
                    </div>

                    {/* Agentes de IA Section */}
                    <div className="mt-8">
                        <AgentesIAManager />
                    </div>
                </div>
            </div>
        </main>
    )
}
