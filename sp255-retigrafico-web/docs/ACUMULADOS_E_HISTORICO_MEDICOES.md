# Acumulados e histórico de medições — v0.3.3

## Objetivo
Responder rapidamente perguntas como:
- quanto de aterro está acumulado no D3 até a MED 05?
- quanto de corte foi aprovado na Frente E na MED 05?
- qual era o acumulado anterior e quanto entrou na medição selecionada?
- quais KMs formam aquele volume aprovado?

## Tela Acumulados
Filtros:
- Medição
- Frente / Estrutura
- Empresa
- Sentido
- Natureza
- Classe
- Recurso
- Status

Saídas:
- Acumulado anterior
- Quantidade da medição
- Acumulado até a medição
- Valores financeiros
- Evolução por medição
- Segmentos/KMs que compõem o volume
- Memória detalhada
- Excel

## Sincronização histórica
A importação é autoritativa por medição, não pela base inteira.

Exemplo:
1. importar aprovados MED 01;
2. importar aprovados MED 02;
3. importar aprovados MED 03;
4. importar aprovados MED 04;
5. importar aprovados MED 05;
6. durante MED 06, reimportar a MED 06 sempre que houver correção.

Uma nova importação da MED 06 não apaga MED 01–05.

## Identidade do recurso
Serial Kartado + Recurso_N.
Assim quantidade, KM, data, status e valores podem ser corrigidos sem criar duplicidade.

## Período
Medição = dia 11 de um mês até dia 10 do mês seguinte.
MED 06 = 11/09/2026 a 10/10/2026.
A partir de 11/10/2026, a classificação automática passa para MED 07.
