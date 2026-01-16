import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/authorized-admins'
import LogsViewer from './LogsViewer'

export default async function LogsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Verificar se é admin
    if (!isAdmin(user.email)) {
        redirect('/dashboard')
    }

    return (
        <main className="min-h-screen relative overflow-hidden">
            {/* Background decorations */}
            <div className="decoration-orb orb-gold w-[400px] h-[400px] -top-32 -right-32 absolute opacity-15 animate-pulse-slow" />
            <div className="decoration-orb orb-red w-[300px] h-[300px] bottom-0 left-0 absolute opacity-10 animate-pulse-slow" />

            {/* Header */}
            <header className="relative z-10 px-6 py-4 border-b border-white/10">
                <nav className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                                <span className="text-xl">🎲</span>
                            </div>
                            <span className="text-xl font-bold text-gradient">Bolão GFT</span>
                        </Link>
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-gray-500/30 text-gray-300 text-sm font-semibold">
                            📋 Logs do Sistema
                        </span>
                    </div>

                    <Link
                        href="/admin"
                        className="text-muted hover:text-white transition-colors text-sm flex items-center gap-2"
                    >
                        ← Voltar ao Admin
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <div className="relative z-10 px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            📋 <span className="text-gradient">Logs do Sistema</span>
                        </h1>
                        <p className="text-muted">Visualize e monitore todos os eventos do sistema</p>
                    </div>

                    {/* Logs Viewer Component */}
                    <LogsViewer />
                </div>
            </div>
        </main>
    )
}
