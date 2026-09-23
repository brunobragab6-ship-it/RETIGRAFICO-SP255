# Consulta rápida e fluxo das medições — v0.3.4

## Objetivo
Separar duas verdades operacionais:
- **Histórico aprovado/fechado**: base oficial das medições já medidas.
- **Fotografia corrente**: apontamentos em andamento da medição atual.

## Consulta rápida
A tela `/consulta` permite escolher medição, recurso, local, empresa e sentido.
O retorno mostra o acumulado anterior, o valor da medição, o acumulado total, R$ e os trechos/KMs.

## Histórico aprovado
Um arquivo pode conter várias medições ao mesmo tempo. Exemplo: MED 01 a MED 05.
O arquivo é autoritativo para as medições contidas nele.

## Medição corrente
Deve conter apenas uma medição. Pode ser reimportada diariamente.
A chave estável é `Serial Kartado + Recurso_N`, portanto correções de quantidade, KM, valor ou status substituem a versão anterior.

## Fechamento
Ao receber os apontamentos aprovados da medição corrente, importe-os no quadro de Histórico Aprovado.
A fotografia corrente daquela medição é substituída pela versão aprovada e a próxima medição passa a ser a corrente.
