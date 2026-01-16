-- =============================================
-- Schema do Bolão GFT
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- Tabela de Bolões
CREATE TABLE IF NOT EXISTS boloes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    quota_value DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    total_quotas INTEGER DEFAULT NULL,  -- NULL = sem limite de cotas
    sold_quotas INTEGER NOT NULL DEFAULT 0,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado', 'sorteado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela de Participações
CREATE TABLE IF NOT EXISTS participacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bolao_id UUID NOT NULL REFERENCES boloes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    quotas INTEGER NOT NULL DEFAULT 1,
    payment_status TEXT NOT NULL DEFAULT 'pendente' CHECK (payment_status IN ('pendente', 'confirmado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bolao_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_boloes_status ON boloes(status);
CREATE INDEX IF NOT EXISTS idx_boloes_deadline ON boloes(deadline);
CREATE INDEX IF NOT EXISTS idx_participacoes_bolao ON participacoes(bolao_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_user ON participacoes(user_id);

-- RLS (Row Level Security) Policies
ALTER TABLE boloes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participacoes ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ver bolões abertos
CREATE POLICY "Bolões visíveis para usuários autenticados"
ON boloes FOR SELECT
TO authenticated
USING (true);

-- Política: Apenas admins podem inserir/atualizar bolões
-- (A verificação de admin será feita no código da aplicação)
CREATE POLICY "Admins podem criar bolões"
ON boloes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins podem atualizar bolões"
ON boloes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Usuários podem ver suas próprias participações
CREATE POLICY "Usuários podem ver participações"
ON participacoes FOR SELECT
TO authenticated
USING (true);

-- Política: Usuários podem criar suas próprias participações
CREATE POLICY "Usuários podem participar"
ON participacoes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar suas próprias participações
CREATE POLICY "Usuários podem atualizar participações"
ON participacoes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Tabela de Emails/Domínios Autorizados
-- =============================================

-- Tabela para gerenciar quais emails ou domínios podem se registrar
CREATE TABLE IF NOT EXISTS emails_autorizados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('email', 'dominio')),
    valor TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_emails_autorizados_tipo ON emails_autorizados(tipo);
CREATE INDEX IF NOT EXISTS idx_emails_autorizados_ativo ON emails_autorizados(ativo);

-- RLS para emails_autorizados
ALTER TABLE emails_autorizados ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler (para validação no registro)
CREATE POLICY "Emails autorizados visíveis para todos"
ON emails_autorizados FOR SELECT
TO authenticated
USING (true);

-- Também permitir leitura anônima para validação no registro
CREATE POLICY "Emails autorizados visíveis para anônimos"
ON emails_autorizados FOR SELECT
TO anon
USING (true);

-- Apenas admins podem inserir/atualizar/deletar (verificação no código)
CREATE POLICY "Admins podem gerenciar emails autorizados"
ON emails_autorizados FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Inserir valores iniciais
INSERT INTO emails_autorizados (tipo, valor, descricao) VALUES
    ('dominio', '@experian.com', 'Domínio corporativo Experian'),
    ('email', 'andretahara@gmail.com', 'Admin principal')
ON CONFLICT (valor) DO NOTHING;

-- =============================================
-- Tabela de Transações Importadas (Extrato Bancário)
-- =============================================

CREATE TABLE IF NOT EXISTS transacoes_importadas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bolao_id UUID NOT NULL REFERENCES boloes(id) ON DELETE CASCADE,
    hash_transacao TEXT NOT NULL,  -- Hash único para evitar duplicatas
    data_transacao TIMESTAMP WITH TIME ZONE,
    valor DECIMAL(10,2) NOT NULL,
    descricao_original TEXT,
    tipo_transacao TEXT DEFAULT 'pix_entrada',
    nome_pagador TEXT,
    documento_pagador TEXT,
    chave_pix TEXT,
    -- Análise da IA
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'ignorado', 'invalido', 'usuario_nao_encontrado')),
    cotas_identificadas INTEGER DEFAULT 0,
    user_id_associado UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    confianca_ia DECIMAL(3,2) DEFAULT 0.00,
    observacao_ia TEXT,
    motivo_rejeicao TEXT,
    -- Controle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    processado_em TIMESTAMP WITH TIME ZONE,
    lote_importacao UUID,  -- Para agrupar transações do mesmo CSV
    UNIQUE(bolao_id, hash_transacao)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_bolao ON transacoes_importadas(bolao_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes_importadas(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_hash ON transacoes_importadas(hash_transacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_lote ON transacoes_importadas(lote_importacao);
CREATE INDEX IF NOT EXISTS idx_transacoes_user ON transacoes_importadas(user_id_associado);

-- RLS para transacoes_importadas
ALTER TABLE transacoes_importadas ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver/gerenciar transações (verificação no código)
CREATE POLICY "Admins podem ver transações"
ON transacoes_importadas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins podem inserir transações"
ON transacoes_importadas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins podem atualizar transações"
ON transacoes_importadas FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins podem deletar transações"
ON transacoes_importadas FOR DELETE
TO authenticated
USING (true);

-- =============================================
-- Sistema de Enquetes
-- =============================================

CREATE TABLE IF NOT EXISTS enquetes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT,
    opcoes JSONB NOT NULL,  -- [{id: "1", texto: "Opção A"}, ...]
    dominios_alvo TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ["@experian.com"] ou [] para todos
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'encerrada')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enquetes_respostas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enquete_id UUID NOT NULL REFERENCES enquetes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    opcao_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enquete_id, user_id)
);

-- Índices para enquetes
CREATE INDEX IF NOT EXISTS idx_enquetes_status ON enquetes(status);
CREATE INDEX IF NOT EXISTS idx_enquetes_data_fim ON enquetes(data_fim);
CREATE INDEX IF NOT EXISTS idx_enquetes_respostas_enquete ON enquetes_respostas(enquete_id);
CREATE INDEX IF NOT EXISTS idx_enquetes_respostas_user ON enquetes_respostas(user_id);

-- RLS para enquetes
ALTER TABLE enquetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquetes_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enquetes_select" ON enquetes FOR SELECT TO authenticated USING (true);
CREATE POLICY "enquetes_insert" ON enquetes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "enquetes_update" ON enquetes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "enquetes_respostas_select" ON enquetes_respostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "enquetes_respostas_insert" ON enquetes_respostas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Caixa de Sugestões e Comentários por Domínio
-- =============================================

CREATE TABLE IF NOT EXISTS comentarios_dominio (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dominio TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT NOT NULL,
    mensagem TEXT NOT NULL CHECK (char_length(mensagem) <= 140),
    aprovado BOOLEAN DEFAULT true,
    moderado_por_ia BOOLEAN DEFAULT false,
    motivo_rejeicao TEXT,
    deletado BOOLEAN DEFAULT false,
    deletado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config_dominios (
    dominio TEXT PRIMARY KEY,
    chat_habilitado BOOLEAN DEFAULT true,
    bloqueado_em TIMESTAMP WITH TIME ZONE,
    bloqueado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para comentários
CREATE INDEX IF NOT EXISTS idx_comentarios_dominio ON comentarios_dominio(dominio);
CREATE INDEX IF NOT EXISTS idx_comentarios_created ON comentarios_dominio(created_at);
CREATE INDEX IF NOT EXISTS idx_comentarios_user ON comentarios_dominio(user_id);

-- RLS para comentários
ALTER TABLE comentarios_dominio ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_dominios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comentarios_select" ON comentarios_dominio FOR SELECT TO authenticated USING (true);
CREATE POLICY "comentarios_insert" ON comentarios_dominio FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comentarios_update" ON comentarios_dominio FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "config_dominios_select" ON config_dominios FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_dominios_all" ON config_dominios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- Sistema de Agentes de IA Configuráveis
-- =============================================

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

-- Índices para agentes
CREATE INDEX IF NOT EXISTS idx_agentes_ia_tipo ON agentes_ia(tipo);
CREATE INDEX IF NOT EXISTS idx_agentes_ia_ativo ON agentes_ia(ativo);
CREATE INDEX IF NOT EXISTS idx_agentes_execucoes_agente ON agentes_execucoes(agente_id);
CREATE INDEX IF NOT EXISTS idx_agentes_execucoes_status ON agentes_execucoes(status);
CREATE INDEX IF NOT EXISTS idx_agentes_execucoes_inicio ON agentes_execucoes(inicio);

-- RLS para agentes
ALTER TABLE agentes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes_execucoes ENABLE ROW LEVEL SECURITY;

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

