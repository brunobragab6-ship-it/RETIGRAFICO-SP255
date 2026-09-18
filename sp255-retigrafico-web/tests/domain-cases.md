# Casos de aceitação implementados na regra de domínio

- `118+780`, `118.780`, `118,780`, `118.78` -> 118780 -> `118+780`.
- `98.13` -> 98130 -> `098+130`.
- Trecho invertido mantém orientação original e usa menor/maior para sobreposição.
- `DISPOSITIVO | KM 118+780` -> D5, não Frente G.
- KM 118+500 sem estrutura explícita -> Frente G.
- KM 095+000 -> sem frente de tronco definida.
- MED 06 -> 11/09/2026 a 10/10/2026 pela regra de medição.
- Retigráfico marca célula de 100 m se houver qualquer interseção do trecho executado com a célula.
