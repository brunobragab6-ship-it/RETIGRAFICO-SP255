# SP-255 — Retigráfico + Caderno Diário + Prévia de Medição

Versão focada em uma única fonte operacional: **Apontamentos (simplificado).xlsx**, exportado do Kartado.

## Fluxo

1. Abra **Importar Apontamentos**.
2. Selecione o Excel `Apontamentos (simplificado)`.
3. Confira os recursos identificados.
4. Confirme a importação.
5. O sistema atualiza Retigráfico, Caderno Diário, Conferência e Prévia de Medição.
6. Em **Prévia Medição**, escolha MED/Lote e baixe o Excel.

## O que mudou nesta versão

- cada `Recurso_N` vira uma execução própria;
- `Recurso_N` é detectado dinamicamente, inclusive além de Recurso_9;
- quantidade, valor e valor unitário são lidos do mesmo índice N;
- `Programação` participa da classificação da frente/dispositivo/remodelação;
- compactações 95%, 100% e 100% (*) são tratadas separadamente;
- marcador contratual `(*)` não é eliminado no mapeamento;
- reimportação faz upsert por Serial + Recurso_N + data;
- Retigráfico usa o nome real do recurso do Kartado;
- Prévia de Medição gera PREVIA 2A, PREVIA 2B, MEMORIA DIARIA e PENDENCIAS;
- preços das abas `analise dados 2a/2b` são fallback quando o Kartado não trouxer Valor Unitário_N;
- a interface de importação aceita apenas XLSX Kartado.

Veja `docs/VALIDACAO_APONTAMENTOS_E_PREVIA.md`.

## Deploy

Next.js 15. Diretório raiz no Vercel: `sp255-retigrafico-web`.

Depois de atualizar os arquivos no GitHub, o Vercel faz novo deploy automaticamente.
