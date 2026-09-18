# SP-255 - Retigráfico e Caderno Diário

Aplicação web criada a partir da planilha atual de Retigráfico/Caderno Diário, da planilha contratual de itens SP-255, do Excel de Apontamentos Simplificados do Kartado e do RDO 120-TP-04 de 18/09/2026.

## O que já funciona

- Dashboard de engenharia com Frentes A-J e estruturas D1-D7, R1-R5 e OAEs.
- Cadastro mestre de KMs conforme o quadro de frentes.
- Normalização de KM: `118+780`, `118.780`, `118,780`, `118.78`, `98.13` etc.
- KM invertido é preservado e normalizado por `km_min/km_max`.
- Classificação com prioridade de estrutura/dispositivo sobre frente de tronco.
- Caderno Diário com KM Inicial e KM Final separados.
- Retigráfico linear por frente em células de 100 m.
- Visualização própria para dispositivos/estruturas (D5 incluído).
- Importação XLSX Kartado: detecta `Recurso_1...Recurso_N` dinamicamente.
- Data de produção prioriza `Executado em`.
- Deduplicação lógica por Serial + Recurso + Data + KM.
- Tela de conferência para atividade pendente e conflito KM/Frente.
- Catálogo canônico gerado da EAP: 414 combinações únicas de serviço/código/unidade encontradas no arquivo fornecido.
- Registro de teste D5 (RDO 120-TP-04): 1.428 m³ e 714 m³·km.
- Exportação do caderno para Excel via SheetJS.
- Impressão/Salvar como PDF em A4 paisagem pelo navegador.
- Schema PostgreSQL/Supabase completo em `supabase/migrations/001_schema.sql`.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Sem Supabase configurado, a versão atual opera em modo local usando `localStorage`, com os lançamentos da planilha atual e o D5 já carregados. Isso permite testar o fluxo imediatamente.

## Produção / persistência compartilhada

1. Crie um projeto Supabase.
2. Rode `supabase/migrations/001_schema.sql`.
3. Preencha `.env.local` a partir de `.env.example`.
4. Conecte os endpoints de persistência às tabelas (o schema já está preparado).
5. Faça deploy no Vercel.

## Importação de RDO

PDF com texto estruturado é lido primeiro sem OCR/IA. Para imagem, a rota aceita interpretação visual quando `OPENAI_API_KEY` e `OPENAI_MODEL` estiverem configurados. A prévia sempre aparece antes da confirmação.

## Arquivos de teste incluídos

- `samples/apontamentos-kartado.xlsx`
- `samples/rdo-120-tp04-2026-09-18.pdf`
- `samples/planilha-atual.xlsx`
