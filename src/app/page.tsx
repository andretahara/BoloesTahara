import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background decorations */}
      <div className="decoration-orb orb-gold w-[500px] h-[500px] -top-64 -left-64 absolute opacity-20 animate-pulse-slow" />
      <div className="decoration-orb orb-red w-[300px] h-[300px] top-1/3 -right-32 absolute opacity-15 animate-pulse-slow" />
      <div className="decoration-orb orb-gold w-[400px] h-[400px] -bottom-32 left-1/4 absolute opacity-20 animate-pulse-slow" />

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <span className="text-xl">🎲</span>
            </div>
            <span className="text-xl font-bold text-gradient">Bolão GFT</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="btn-secondary">
              Entrar
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-8 pb-20 md:pt-16 md:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-muted">Bolão ativo agora!</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                <span className="text-gradient">Participe do maior</span>
                <br />
                <span className="text-gold">bolão da empresa</span>
              </h1>

              <p className="text-lg text-muted mb-8 max-w-lg mx-auto lg:mx-0">
                Junte-se aos seus colegas e concorra aos maiores prêmios das loterias.
                Simples, seguro e transparente.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/registro" className="btn-primary inline-flex items-center justify-center gap-2">
                  <span>Começar Agora</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="#como-funciona" className="btn-secondary inline-flex items-center justify-center gap-2">
                  <span>Como funciona?</span>
                </Link>
              </div>
            </div>

            {/* Right - Prize Card */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="prize-card animate-float max-w-md w-full">
                <div className="text-center">
                  <p className="text-muted mb-2 flex items-center justify-center gap-2">
                    <span>🏆</span>
                    <span>Próximo Prêmio Estimado</span>
                  </p>
                  <div className="prize-value">R$ 350</div>
                  <p className="text-2xl font-bold text-muted">MILHÕES</p>

                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-white">127</p>
                        <p className="text-xs text-muted">Participantes</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">45</p>
                        <p className="text-xs text-muted">Cotas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-400">Ativo</p>
                        <p className="text-xs text-muted">Status</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Sorteio: Sábado, 20:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="como-funciona" className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">
              Como funciona?
            </h2>
            <p className="text-muted max-w-2xl mx-auto">
              Participar é simples e seguro. Veja como funciona em 3 passos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-yellow-500/30">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Cadastre-se</h3>
              <p className="text-muted text-sm">
                Use seu email corporativo @experian.com para criar sua conta de forma segura.
              </p>
            </div>

            {/* Step 2 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/30">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Escolha suas cotas</h3>
              <p className="text-muted text-sm">
                Veja os bolões disponíveis e escolha quantas cotas deseja participar.
              </p>
            </div>

            {/* Step 3 */}
            <div className="feature-card text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Torça e Ganhe!</h3>
              <p className="text-muted text-sm">
                Acompanhe os resultados e veja automaticamente se você ganhou.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="stats-card p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl md:text-4xl font-bold text-gold mb-2">R$ 2.5M+</p>
                <p className="text-muted text-sm">Prêmios distribuídos</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-2">500+</p>
                <p className="text-muted text-sm">Participantes</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-2">150+</p>
                <p className="text-muted text-sm">Bolões realizados</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-green-400 mb-2">100%</p>
                <p className="text-muted text-sm">Transparência</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gradient">
            Pronto para tentar a sorte?
          </h2>
          <p className="text-lg text-muted mb-8 max-w-2xl mx-auto">
            Entre agora e participe do próximo bolão. É rápido, fácil e você pode ser o próximo ganhador!
          </p>
          <Link href="/registro" className="btn-primary inline-flex items-center gap-2 text-lg">
            <span>Criar minha conta</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
              <span className="text-sm">🎲</span>
            </div>
            <span className="font-bold">Bolão GFT</span>
          </div>
          <p className="text-sm text-muted">
            © 2026 Bolão GFT - Todos os direitos reservados
          </p>
        </div>
      </footer>
    </main>
  )
}
