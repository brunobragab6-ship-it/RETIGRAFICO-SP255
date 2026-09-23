# Sincronização do Apontamentos (simplificado) — v0.3.2

A importação não é mais apenas um "acréscimo" à base anterior.

O Excel mais recente é tratado como a **fotografia oficial atual do Kartado**.

## Identidade do registro

Cada recurso é identificado por:

`Serial Kartado + Recurso_N`

Data, KM, quantidade, status e valores **não** fazem parte da identidade, porque podem ser corrigidos no mesmo apontamento.

## Resultado da reimportação

- quantidade corrigida -> ATUALIZA;
- KM corrigido -> ATUALIZA;
- data corrigida -> ATUALIZA;
- status/equipe/empresa/valor corrigido -> ATUALIZA;
- recurso novo -> ADICIONA;
- recurso removido do arquivo atual -> REMOVE;
- apontamento/Serial removido do arquivo atual -> REMOVE todos os seus recursos;
- lançamento manual -> PRESERVA.

## Conferência antes de gravar

A tela mostra os contadores:

- NOVOS;
- ALTERADOS;
- EXCLUÍDOS;
- SEM ALTERAÇÃO;
- BASE APÓS SINCRONIZAÇÃO.

Itens alterados exibem os campos detectados como diferentes e um resumo ANTES / DEPOIS.

## Segurança

Importe sempre o **Apontamentos (simplificado) completo**. Se o novo arquivo tiver uma queda muito grande de recursos em relação à base atual, o sistema mostra um alerta antes da confirmação.
