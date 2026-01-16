---
description: Atualizar o arquivo de histórico de conversas a cada interação
---

# Workflow: Atualização Automática do Histórico

## Regra Obrigatória
A cada resposta que você der ao usuário, ANTES de finalizar, você DEVE:

1. Abrir o arquivo `C:\Users\Tahara\.gemini\antigravity\scratch\bolaogft\tudoquefizemos.txt`
2. Adicionar ao final do arquivo (SEM sobrescrever o conteúdo existente) uma nova entrada com:
   - Data e hora atual
   - O que o usuário perguntou/pediu (resumo)
   - O que você fez/respondeu (resumo)
   - Arquivos criados ou modificados (se houver)

## Formato da Entrada
```
---
[DATA HORA] - Interação #X
USUÁRIO: [resumo do pedido]
ASSISTENTE: [resumo da ação/resposta]
ARQUIVOS: [lista de arquivos, se aplicável]
---
```

## Exemplo
```
---
2026-01-15 23:38 - Interação #42
USUÁRIO: Pediu para criar sistema de enquetes
ASSISTENTE: Criei tabelas no banco, componentes CreateEnqueteForm, EnquetesAdminList e EnquetesUserSection
ARQUIVOS: src/app/admin/CreateEnqueteForm.tsx, src/app/admin/EnquetesAdminList.tsx
---
```

## Importante
- NUNCA sobrescrever o arquivo, sempre ADICIONAR ao final
- Manter o registro mesmo para perguntas simples
- Este workflow é PERMANENTE e deve ser seguido em TODAS as sessões
