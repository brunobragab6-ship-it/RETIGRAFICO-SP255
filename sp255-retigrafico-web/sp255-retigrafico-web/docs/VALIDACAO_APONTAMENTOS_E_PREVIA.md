# Validação — Apontamentos (simplificado) + Prévia de Medição

Arquivos analisados em 18/09/2026:

- `Apontamentos (simplificado) - 2026-09-18T200245.597.xlsx`
- `PREVISÃO MEDIÇÃO MODELO SIS.xlsx`

## 1. Estrutura real do Kartado

A planilha possui 748 linhas de apontamentos e até `Recurso_9`.
O importador agora detecta `Recurso_N` dinamicamente e transforma cada recurso em uma execução rastreável.
Na amostra foram encontrados 1.501 lançamentos de recurso e 73 nomes de recursos distintos.

Campos preservados: Serial, km inicial/final, Natureza, Classe, Sentido, Status, Empresa, Equipe, Programação, Executado em, Observações, Recurso_N, Quantidade_N, Valor_N e Valor Unitário_N.

A data de produção usa prioritariamente `Executado em`.

## 2. Compactações

No arquivo real existem:

- 127 lançamentos — `Compactação de aterro a 95% do proctor normal (m³)` — de 27/06/2026 a 04/09/2026;
- 20 lançamentos — `Compactação de aterro a 100% do proctor intermediário (m³)` — de 19/06/2026 a 19/08/2026;
- 9 lançamentos — `Compactação de aterro a 100% do proctor intermediário (*) (m³)` — de 15/07/2026 a 15/08/2026.

Portanto, nesta exportação específica, **não existe compactação com Executado em dentro da MED 06 (11/09/2026 a 10/10/2026)**.
Isso significa que o filtro `MED 06` corretamente não deve inventar compactações; elas aparecem em `Acumulado` e nas medições correspondentes.

O problema anterior de classificação foi corrigido usando também o campo `Programação`. Exemplos como `Dispositivo - 118+780 - Terraplenagem - Medição 5` passam a ser classificados como D5, e não apenas como Frente G ou REVIEW.

## 3. Abas “analise dados 2a” e “analise dados 2b”

Essas abas foram usadas como referência contratual para:

- código ART.;
- descrição canônica;
- unidade;
- valor unitário por lote.

Exemplo confirmado:

- `ART.01.04.01 — Compactação de aterro a 95% do proctor normal`: R$ 10,07 no Lote 2A e R$ 11,04 no Lote 2B;
- `ART.01.04.03 — Compactação de aterro a 100% do proctor intermediário`: R$ 13,68 no Lote 2A e R$ 14,99 no Lote 2B.

O sistema prioriza `Valor Unitário_N` recebido do Kartado. Se ele vier vazio e o recurso estiver vinculado a um código contratual seguro, usa o valor da análise do lote como fallback. Não altera valores de origem.

## 4. Prévia de Medição

A nova exportação possui:

- `PREVIA 2A`;
- `PREVIA 2B`;
- `MEMORIA DIARIA`;
- `PENDENCIAS`.

A prévia consolida por:

1. Lote;
2. Frente / estrutura;
3. Segmento de KM;
4. Natureza;
5. Classe;
6. código contratual;
7. recurso exato do Kartado;
8. unidade.

Mostra as quatro janelas semanais da medição, Quantidade Executada, R$ Unitário, R$ Executado, trechos realmente executados, dias e quantidade de Seriais.

A `MEMORIA DIARIA` mantém uma linha por `Serial + Recurso_N`, permitindo conferir exatamente qual volume foi executado em cada dia e em qual KM.

## 5. Importação única

A interface operacional aceita somente `.xlsx` do `Apontamentos (simplificado)`.
PDF, imagem e outros fluxos não aparecem mais na tela de importação.

## 6. Regra de reimportação

O ID lógico usa `Serial + Recurso_N + data de execução`.
Ao importar novamente uma planilha mais atual, o registro é atualizado (upsert) e não duplicado.
