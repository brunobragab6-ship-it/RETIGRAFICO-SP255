# Análise dos arquivos reais

## 1. Planilha atual de Caderno/Retigráfico

Foram encontradas 8 abas: `LANÇAMENTOS DIÁRIOS`, `ATIVIDADES`, `FRENTE C`, `FRENTE D`, `FRENTE E`, `FRENTE F`, `FRENTE G` e `FRENTE H`.

Problemas confirmados:

- As fórmulas das frentes trabalham com intervalo fixo até a linha 500, por exemplo `LANÇAMENTOS DIÁRIOS!$G$5:$G$500`.
- A atividade é comparada por igualdade de texto com o nome da linha do retigráfico; variação no nome impede a marcação.
- O arquivo ainda não contém Frentes A, B, I e J.
- A aba `ATIVIDADES` usada no retigráfico contém cerca de 77 nomes de atividade, enquanto a planilha contratual possui uma quantidade muito maior de serviços.
- Existem linhas de grupo/subgrupo misturadas às atividades nas abas de frente e nomes repetidos, portanto o número visual de linhas não corresponde ao número de atividades canônicas.

## 2. Planilha contratual EAP 2A/2B

Na aba EAP2A foram lidas 1.777 ocorrências de `VI. SERVIÇO ARTERIS`, correspondendo a 414 combinações únicas de `código + descrição + unidade` após consolidação dos vários segmentos.

O projeto usa essas 414 combinações como catálogo canônico inicial, mantendo grupo, subgrupo, código, unidade, empresas e segmentos onde o serviço aparece.

## 3. Excel Kartado - Apontamentos Simplificados

O arquivo contém os campos de identificação, KM, Natureza, Classe, Sentido, Status, Empresa, Equipe, datas e recursos repetidos (`Recurso_1`, `Quantidade_1`, etc.). O importador implementado percorre `Recurso_N` dinamicamente em vez de limitar a uma quantidade fixa.

Na amostra existem 68 nomes únicos de recurso. Vários carregam a unidade no próprio texto, enquanto o retigráfico antigo usa o nome sem a unidade; por isso a igualdade exata é estruturalmente frágil.

Exemplo real: `Imprimadura ligante (Cura) - sem o fornecimento dos materiais (m²)` precisa aparecer no retigráfico da Frente C nos trechos correspondentes, mesmo que o nome canônico/retigráfico tenha variação textual.

## 4. RDO 120 - TP-04 de 18/09/2026

O RDO informa explicitamente `DISPOSITIVO | KM 118+780`; portanto a classificação correta é D5, com prioridade sobre a Frente G.

Atividades de validação incorporadas ao seed:

- Carga de material em Bota Espera: 1.428,00 m³.
- Transporte DMT até 1 km: 714,00 m³·km.

Memória coerente: 30,00 x 6,80 = 204,00 m²; 204,00 x 7,00 = 1.428,00 m³; 102 x 14,00 = 1.428,00 m³; 1.428,00 x 0,50 = 714,00 m³·km.

## 5. Correção de arquitetura aplicada

O sistema não usa mais o nome de uma célula como chave de negócio. A representação trabalha com:

1. catálogo canônico;
2. aliases/de-para;
3. normalização de texto;
4. pendência explícita quando não houver vínculo;
5. classificação separada de Frente x Estrutura;
6. KM normalizado em metros;
7. preservação do KM e texto originais;
8. deduplicação lógica para importações Kartado.
