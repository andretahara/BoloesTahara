-- =============================================
-- Sistema de Agentes de IA Configuráveis
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- Tabela de Agentes de IA
CREATE TABLE IF NOT EXISTS agentes_ia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    prompt TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('homepage', 'moderacao', 'csv_stats')),
    frequencia TEXT NOT NULL DEFAULT 'manual' CHECK (frequencia IN ('manual', 'minuto', 'hora', 'dia', 'segunda')),
    ativo BOOLEAN DEFAULT true,
    ultima_execucao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Histórico de Execuções
CREATE TABLE IF NOT EXISTS agentes_execucoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agente_id UUID NOT NULL REFERENCES agentes_ia(id) ON DELETE CASCADE,
    inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fim TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
    resultado JSONB,
    erro TEXT,
    tokens_usados INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agentes_ia_tipo ON agentes_ia(tipo);
CREATE INDEX IF NOT EXISTS idx_agentes_ia_ativo ON agentes_ia(ativo);
CREATE INDEX IF NOT EXISTS idx_agentes_execucoes_agente ON agentes_execucoes(agente_id);
CREATE INDEX IF NOT EXISTS idx_agentes_execucoes_status ON agentes_execucoes(status);
CREATE INDEX IF NOT EXISTS idx_agentes_execucoes_inicio ON agentes_execucoes(inicio);

-- RLS (Row Level Security)
ALTER TABLE agentes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes_execucoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "agentes_ia_select" ON agentes_ia FOR SELECT TO authenticated USING (true);
CREATE POLICY "agentes_ia_insert" ON agentes_ia FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "agentes_ia_update" ON agentes_ia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "agentes_ia_delete" ON agentes_ia FOR DELETE TO authenticated USING (true);

CREATE POLICY "agentes_execucoes_select" ON agentes_execucoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "agentes_execucoes_insert" ON agentes_execucoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "agentes_execucoes_update" ON agentes_execucoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Dados iniciais dos 3 agentes
INSERT INTO agentes_ia (nome, descricao, prompt, tipo, frequencia) VALUES
(
    'Atualizador de Homepage',
    'Gera conteúdo dinâmico e promocional para a página inicial do Bolão GFT',
    'Você é um copywriter especializado em marketing de loteria e jogos. Seu objetivo é criar textos persuasivos e emocionantes que incentivem a participação nos bolões. Use gatilhos de urgência, escassez e prova social. Mantenha o tom profissional mas empolgante. Retorne APENAS o JSON com os campos: titulo, subtitulo, destaque, cta_texto.',
    'homepage',
    'segunda'
),
(
    'Moderador de Comentários',
    'Analisa e modera comentários dos usuários para manter um ambiente saudável',
    'Você é um moderador de conteúdo responsável por analisar comentários em uma plataforma corporativa de bolões. Analise o comentário e determine se ele é: 1) APROVAR - comentário adequado, respeitoso e pertinente; 2) REJEITAR - comentário ofensivo, spam, ou inadequado. Retorne APENAS o JSON: {"decisao": "aprovar" ou "rejeitar", "motivo": "breve explicação"}.',
    'moderacao',
    'minuto'
),
(
    'Analisador de Extratos CSV',
    'Processa extratos bancários importados e gera estatísticas dos bolões',
    'Você é um analista financeiro especializado em conciliação bancária. Analise as transações do extrato CSV e identifique: pagamentos de cotas de bolão, valores, datas e possíveis irregularidades. Retorne estatísticas em JSON: {"total_transacoes", "valor_total", "transacoes_identificadas", "alertas"}.',
    'csv_stats',
    'manual'
)
ON CONFLICT DO NOTHING;
