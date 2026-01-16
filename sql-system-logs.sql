-- =============================================
-- Sistema de Logs Centralizado
-- Execute este script no SQL Editor do Supabase
-- =============================================

CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria TEXT NOT NULL CHECK (categoria IN ('aplicacao', 'ia', 'banco', 'usuario', 'outro')),
    nivel TEXT NOT NULL DEFAULT 'info' CHECK (nivel IN ('debug', 'info', 'warning', 'error', 'critical')),
    mensagem TEXT NOT NULL,
    detalhes JSONB,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_email TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_logs_categoria ON system_logs(categoria);
CREATE INDEX IF NOT EXISTS idx_system_logs_nivel ON system_logs(nivel);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_usuario ON system_logs(usuario_id);

-- RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs
CREATE POLICY "system_logs_select" ON system_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "system_logs_insert" ON system_logs FOR INSERT TO authenticated WITH CHECK (true);
