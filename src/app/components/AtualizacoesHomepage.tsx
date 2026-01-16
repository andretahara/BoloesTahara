'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UpdateContent {
    titulo?: string;
    subtitulo?: string;
    destaque?: string;
    cta_texto?: string;
}

interface AtualizacoesHomepageProps {
    variant?: 'landing' | 'dashboard';
}

export default function AtualizacoesHomepage({ variant = 'landing' }: AtualizacoesHomepageProps) {
    const [content, setContent] = useState<UpdateContent | null>(null);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        carregarAtualizacao();
    }, []);

    async function carregarAtualizacao() {
        setLoading(true);

        // Buscar última execução bem-sucedida do agente de homepage
        const { data: execucao } = await supabase
            .from('agentes_execucoes')
            .select('*, agentes_ia!inner(tipo)')
            .eq('agentes_ia.tipo', 'homepage')
            .eq('status', 'success')
            .order('fim', { ascending: false })
            .limit(1)
            .single();

        if (execucao?.resultado) {
            setContent(execucao.resultado as UpdateContent);
            setLastUpdate(execucao.fim);
        } else {
            // Fallback se não houver execução
            setContent({
                titulo: '🎲 Participe dos Bolões da Empresa!',
                subtitulo: 'Junte-se aos colegas e concorra a prêmios incríveis',
                destaque: 'Novos bolões disponíveis',
                cta_texto: 'Ver Bolões',
            });
        }

        setLoading(false);
    }

    if (loading) {
        return (
            <div className={`${variant === 'landing' ? 'bg-gradient-to-r from-amber-500/10 to-red-500/10' : 'bg-amber-500/5'} rounded-2xl p-6 border border-amber-500/20 animate-pulse`}>
                <div className="h-6 bg-amber-500/20 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-amber-500/10 rounded w-1/2"></div>
            </div>
        );
    }

    if (!content) return null;

    if (variant === 'dashboard') {
        return (
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-amber-500/30 relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />

                <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">✨</span>
                                <span className="text-xs text-amber-400 font-medium uppercase tracking-wide">
                                    Destaque da Semana
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">
                                {content.titulo}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                {content.subtitulo}
                            </p>
                        </div>

                        {content.destaque && (
                            <div className="bg-amber-500/20 rounded-xl px-3 py-2 text-center flex-shrink-0">
                                <p className="text-amber-400 font-bold text-sm">
                                    {content.destaque}
                                </p>
                            </div>
                        )}
                    </div>

                    {lastUpdate && (
                        <p className="text-xs text-gray-500 mt-4">
                            Atualizado em {new Date(lastUpdate).toLocaleDateString('pt-BR')}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Variant: landing
    return (
        <div className="bg-gradient-to-r from-amber-500/5 via-orange-500/10 to-red-500/5 rounded-3xl p-8 border border-amber-500/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />

            <div className="relative text-center">
                <span className="inline-block text-4xl mb-4">🌟</span>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    {content.titulo}
                </h2>

                <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
                    {content.subtitulo}
                </p>

                {content.destaque && (
                    <div className="inline-block bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl px-6 py-3 border border-amber-500/30 mb-6">
                        <p className="text-amber-400 font-bold text-lg">
                            {content.destaque}
                        </p>
                    </div>
                )}

                {content.cta_texto && (
                    <a
                        href="/login"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-2xl hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/30"
                    >
                        <span>🎲</span>
                        <span>{content.cta_texto}</span>
                    </a>
                )}
            </div>
        </div>
    );
}
