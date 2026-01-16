'use client'

import { useState, useRef } from 'react'

interface TransacaoAnalisada {
    data_transacao: string
    valor: number
    descricao_original: string
    nome_pagador: string
    documento_pagador: string | null
    tipo_transacao: string
    cotas_identificadas: number
    status: string
    confianca_ia: number
    observacao_ia: string
    motivo_rejeicao: string | null
    user_email_sugerido: string | null
}

interface Resumo {
    total_depositos: number
    total_valor: number
    cotas_identificadas: number
    depositos_validos: number
    depositos_invalidos: number
    usuarios_nao_encontrados: number
    ja_processados: number
}

interface AnaliseResult {
    success: boolean
    lote_id: string
    analise: {
        transacoes: TransacaoAnalisada[]
        resumo: Resumo
    }
    transacoes_salvas: number
    transacoes_ignoradas: number
}

interface ImportExtratoModalProps {
    bolaoId: string
    valorCota: number
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function ImportExtratoModal({
    bolaoId,
    valorCota,
    isOpen,
    onClose,
    onSuccess
}: ImportExtratoModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<AnaliseResult | null>(null)
    const [error, setError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.csv')) {
                setError('Por favor, selecione um arquivo CSV')
                return
            }
            setFile(selectedFile)
            setError('')
            setResult(null)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            if (!droppedFile.name.endsWith('.csv')) {
                setError('Por favor, selecione um arquivo CSV')
                return
            }
            setFile(droppedFile)
            setError('')
            setResult(null)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleUpload = async () => {
        if (!file) return

        setLoading(true)
        setError('')

        const formData = new FormData()
        formData.append('csv', file)

        try {
            const response = await fetch(`/api/admin/bolao/${bolaoId}/import-csv`, {
                method: 'POST',
                body: formData
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao processar arquivo')
            }

            setResult(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setFile(null)
        setResult(null)
        setError('')
        onClose()
    }

    const handleConfirm = () => {
        onSuccess()
        handleClose()
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pendente':
                return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">⏳ Pendente</span>
            case 'aprovado':
                return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">✅ Aprovado</span>
            case 'invalido':
                return <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">⚠️ Valor Inválido</span>
            case 'usuario_nao_encontrado':
                return <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">❌ Usuário não encontrado</span>
            case 'ignorado':
                return <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">🔄 Já processado</span>
            default:
                return <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">{status}</span>
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            📊 Importar Extrato Bancário
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-muted mt-1">
                        Faça upload do CSV do extrato bancário para identificar depósitos PIX
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {!result ? (
                        <>
                            {/* Upload Area */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                    ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                {file ? (
                                    <div>
                                        <div className="text-4xl mb-3">📄</div>
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-muted mt-1">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setFile(null)
                                            }}
                                            className="mt-3 text-sm text-red-400 hover:text-red-300"
                                        >
                                            Remover arquivo
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-4xl mb-3">📁</div>
                                        <p className="font-medium">Arraste o arquivo CSV aqui</p>
                                        <p className="text-sm text-muted mt-1">
                                            ou clique para selecionar
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <p className="text-sm text-blue-400">
                                    💡 A IA irá analisar o extrato e identificar automaticamente:
                                </p>
                                <ul className="text-sm text-muted mt-2 space-y-1 ml-6 list-disc">
                                    <li>Depósitos PIX de entrada</li>
                                    <li>Quantidade de cotas (valor ÷ R$ {valorCota.toFixed(2)})</li>
                                    <li>Nome do pagador e associação com usuários cadastrados</li>
                                    <li>Transações já processadas anteriormente</li>
                                </ul>
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Resultado da Análise */}
                            <div className="space-y-6">
                                {/* Resumo */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="glass rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-green-400">
                                            {result.analise.resumo.depositos_validos}
                                        </div>
                                        <div className="text-xs text-muted mt-1">Válidos</div>
                                    </div>
                                    <div className="glass rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-purple-400">
                                            {result.analise.resumo.cotas_identificadas}
                                        </div>
                                        <div className="text-xs text-muted mt-1">Cotas</div>
                                    </div>
                                    <div className="glass rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-yellow-400">
                                            R$ {result.analise.resumo.total_valor.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted mt-1">Total</div>
                                    </div>
                                    <div className="glass rounded-xl p-4 text-center">
                                        <div className="text-2xl font-bold text-red-400">
                                            {result.analise.resumo.depositos_invalidos + result.analise.resumo.usuarios_nao_encontrados}
                                        </div>
                                        <div className="text-xs text-muted mt-1">Pendências</div>
                                    </div>
                                </div>

                                {/* Alertas */}
                                {result.transacoes_ignoradas > 0 && (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                                        🔄 {result.transacoes_ignoradas} transação(ões) ignorada(s) pois já foram processadas anteriormente.
                                    </div>
                                )}

                                {result.analise.resumo.usuarios_nao_encontrados > 0 && (
                                    <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm">
                                        ⚠️ {result.analise.resumo.usuarios_nao_encontrados} depósito(s) de usuários não cadastrados no bolão.
                                    </div>
                                )}

                                {/* Lista de Transações */}
                                <div>
                                    <h3 className="font-medium mb-3">Transações Identificadas</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {result.analise.transacoes.map((t, idx) => (
                                            <div
                                                key={idx}
                                                className="glass rounded-lg p-3 flex items-center justify-between"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{t.nome_pagador}</span>
                                                        {getStatusBadge(t.status)}
                                                    </div>
                                                    <div className="text-sm text-muted mt-1">
                                                        {t.data_transacao} • {t.descricao_original?.substring(0, 50)}...
                                                    </div>
                                                    {t.motivo_rejeicao && (
                                                        <div className="text-xs text-red-400 mt-1">
                                                            {t.motivo_rejeicao}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold">R$ {t.valor.toFixed(2)}</div>
                                                    {t.cotas_identificadas > 0 && (
                                                        <div className="text-sm text-purple-400">
                                                            {t.cotas_identificadas} cota(s)
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Confiança da IA */}
                                <div className="text-sm text-muted text-center">
                                    🤖 Análise realizada por IA •
                                    Confiança média: {
                                        (result.analise.transacoes.reduce((acc, t) => acc + t.confianca_ia, 0) /
                                            result.analise.transacoes.length * 100).toFixed(0)
                                    }%
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                        {result ? 'Fechar' : 'Cancelar'}
                    </button>
                    {!result && file && (
                        <button
                            onClick={handleUpload}
                            disabled={loading}
                            className="btn-primary disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analisando com IA...
                                </span>
                            ) : (
                                '🤖 Analisar com IA'
                            )}
                        </button>
                    )}
                    {result && result.analise.resumo.depositos_validos > 0 && (
                        <button
                            onClick={handleConfirm}
                            className="btn-primary"
                        >
                            ✅ Confirmar {result.analise.resumo.depositos_validos} depósitos
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
