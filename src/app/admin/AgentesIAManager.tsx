'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Agente {
    id: string;
    nome: string;
    descricao: string;
    prompt: string;
    tipo: 'homepage' | 'moderacao' | 'csv_stats';
    frequencia: 'manual' | 'minuto' | 'hora' | 'dia' | 'segunda';
    ativo: boolean;
    ultima_execucao: string | null;
    created_at: string;
}

interface Execucao {
    id: string;
    agente_id: string;
    inicio: string;
    fim: string | null;
    status: 'running' | 'success' | 'error';
    resultado: Record<string, unknown> | null;
    erro: string | null;
    tokens_usados: number;
}

const FREQUENCIA_LABELS: Record<string, string> = {
    manual: '⚙️ Manual',
    minuto: '⏱️ A cada minuto',
    hora: '🕐 A cada hora',
    dia: '📅 Diariamente',
    segunda: '📆 Toda segunda-feira',
};

const TIPO_ICONS: Record<string, string> = {
    homepage: '🏠',
    moderacao: '🛡️',
    csv_stats: '📊',
};

export default function AgentesIAManager() {
    const [agentes, setAgentes] = useState<Agente[]>([]);
    const [execucoes, setExecucoes] = useState<Execucao[]>([]);
    const [loading, setLoading] = useState(true);
    const [executando, setExecutando] = useState<string | null>(null);
    const [editandoAgente, setEditandoAgente] = useState<Agente | null>(null);
    const [promptEditado, setPromptEditado] = useState('');
    const [frequenciaEditada, setFrequenciaEditada] = useState('');
    const [salvando, setSalvando] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        carregarDados();
    }, []);

    async function carregarDados() {
        setLoading(true);

        // Carregar agentes
        const { data: agentesData } = await supabase
            .from('agentes_ia')
            .select('*')
            .order('created_at');

        // Carregar últimas execuções
        const { data: execucoesData } = await supabase
            .from('agentes_execucoes')
            .select('*')
            .order('inicio', { ascending: false })
            .limit(20);

        setAgentes(agentesData || []);
        setExecucoes(execucoesData || []);
        setLoading(false);
    }

    async function toggleAtivo(agente: Agente) {
        const { error } = await supabase
            .from('agentes_ia')
            .update({ ativo: !agente.ativo })
            .eq('id', agente.id);

        if (!error) {
            setAgentes(agentes.map(a =>
                a.id === agente.id ? { ...a, ativo: !a.ativo } : a
            ));
        }
    }

    async function executarAgente(agente: Agente) {
        setExecutando(agente.id);

        try {
            const response = await fetch('/api/agents/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agente_id: agente.id }),
            });

            const result = await response.json();

            if (response.ok) {
                await carregarDados();
            } else {
                alert('Erro ao executar agente: ' + (result.error || 'Erro desconhecido'));
            }
        } catch (err) {
            console.error('Erro:', err);
            alert('Erro de conexão ao executar agente');
        } finally {
            setExecutando(null);
        }
    }

    function abrirEdicao(agente: Agente) {
        setEditandoAgente(agente);
        setPromptEditado(agente.prompt);
        setFrequenciaEditada(agente.frequencia);
    }

    async function salvarEdicao() {
        if (!editandoAgente) return;

        setSalvando(true);

        const { error } = await supabase
            .from('agentes_ia')
            .update({
                prompt: promptEditado,
                frequencia: frequenciaEditada,
            })
            .eq('id', editandoAgente.id);

        if (!error) {
            setAgentes(agentes.map(a =>
                a.id === editandoAgente.id
                    ? { ...a, prompt: promptEditado, frequencia: frequenciaEditada as Agente['frequencia'] }
                    : a
            ));
            setEditandoAgente(null);
        } else {
            alert('Erro ao salvar: ' + error.message);
        }

        setSalvando(false);
    }

    function formatarData(data: string | null) {
        if (!data) return 'Nunca';
        return new Date(data).toLocaleString('pt-BR');
    }

    function getExecucoesDoAgente(agenteId: string) {
        return execucoes.filter(e => e.agente_id === agenteId).slice(0, 3);
    }

    if (loading) {
        return (
            <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-amber-500/20">
                <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400">Carregando agentes...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        🤖 Agentes de IA
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Configure prompts e frequências de execução dos agentes
                    </p>
                </div>
                <button
                    onClick={carregarDados}
                    className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
                >
                    🔄 Atualizar
                </button>
            </div>

            {/* Lista de Agentes */}
            <div className="grid gap-4">
                {agentes.map((agente) => (
                    <div
                        key={agente.id}
                        className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                    >
                        {/* Cabeçalho do Agente */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{TIPO_ICONS[agente.tipo]}</span>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{agente.nome}</h3>
                                    <p className="text-gray-400 text-sm">{agente.descricao}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Toggle Ativo/Inativo */}
                                <button
                                    onClick={() => toggleAtivo(agente)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${agente.ativo
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-gray-700/50 text-gray-500 border border-gray-600'
                                        }`}
                                >
                                    {agente.ativo ? '✓ Ativo' : '○ Inativo'}
                                </button>

                                {/* Botão Editar */}
                                <button
                                    onClick={() => abrirEdicao(agente)}
                                    className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors text-sm"
                                >
                                    ✏️ Editar
                                </button>

                                {/* Botão Executar */}
                                <button
                                    onClick={() => executarAgente(agente)}
                                    disabled={executando === agente.id || !agente.ativo}
                                    className={`px-4 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${agente.ativo
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        }`}
                                >
                                    {executando === agente.id ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            Executando...
                                        </>
                                    ) : (
                                        <>▶ Executar Agora</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Informações do Agente */}
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
                            <div>
                                <span className="text-gray-500 text-xs uppercase tracking-wide">Frequência</span>
                                <p className="text-white text-sm mt-1">{FREQUENCIA_LABELS[agente.frequencia]}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs uppercase tracking-wide">Última Execução</span>
                                <p className="text-white text-sm mt-1">{formatarData(agente.ultima_execucao)}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs uppercase tracking-wide">Tipo</span>
                                <p className="text-white text-sm mt-1 capitalize">{agente.tipo.replace('_', ' ')}</p>
                            </div>
                        </div>

                        {/* Histórico Recente */}
                        {getExecucoesDoAgente(agente.id).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <span className="text-gray-500 text-xs uppercase tracking-wide">Últimas Execuções</span>
                                <div className="mt-2 space-y-1">
                                    {getExecucoesDoAgente(agente.id).map((exec) => (
                                        <div key={exec.id} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">{formatarData(exec.inicio)}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${exec.status === 'success' ? 'bg-green-500/20 text-green-400' :
                                                exec.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {exec.status === 'success' ? '✓ Sucesso' :
                                                    exec.status === 'error' ? '✗ Erro' : '⟳ Executando'}
                                            </span>
                                            {exec.tokens_usados > 0 && (
                                                <span className="text-gray-500 text-xs">{exec.tokens_usados} tokens</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal de Edição */}
            {editandoAgente && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border border-amber-500/30 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {TIPO_ICONS[editandoAgente.tipo]} Editar: {editandoAgente.nome}
                            </h3>
                            <button
                                onClick={() => setEditandoAgente(null)}
                                className="text-gray-400 hover:text-white transition-colors text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Frequência */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Frequência de Execução
                            </label>
                            <select
                                value={frequenciaEditada}
                                onChange={(e) => setFrequenciaEditada(e.target.value)}
                                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                            >
                                <option value="manual">⚙️ Manual (apenas pelo botão)</option>
                                <option value="minuto">⏱️ A cada minuto (se houver pendências)</option>
                                <option value="hora">🕐 A cada hora</option>
                                <option value="dia">📅 Diariamente (à meia-noite)</option>
                                <option value="segunda">📆 Toda segunda-feira</option>
                            </select>
                        </div>

                        {/* Prompt */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Prompt do Agente
                            </label>
                            <textarea
                                value={promptEditado}
                                onChange={(e) => setPromptEditado(e.target.value)}
                                rows={8}
                                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none font-mono text-sm"
                                placeholder="Digite o prompt que será enviado à IA..."
                            />
                            <p className="text-gray-500 text-xs mt-2">
                                Este é o prompt que será enviado ao Gemini quando o agente for executado.
                            </p>
                        </div>

                        {/* Botões */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setEditandoAgente(null)}
                                className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvarEdicao}
                                disabled={salvando}
                                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {salvando ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>💾 Salvar Alterações</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
