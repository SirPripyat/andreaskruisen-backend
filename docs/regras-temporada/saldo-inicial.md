# Cálculo do saldo inicial por equilíbrio de elenco

> Regra de início de temporada. Reaproveita a fórmula do mercado tradicional (ver [v1-transferencias.md](./v1-transferencias.md)), mas não é uma transferência real — nenhum jogador troca de clube, nenhum cupom é gasto. É só usada como "régua" pra medir a força de cada elenco.

## Problema que resolve

Cada participante escolhe um time real pra representar na temporada (ex.: Barcelona, Ajax). Times reais têm elencos muito desiguais — um pode ter 17 jogadores acima de um certo overall, outro só 2. Sem compensação, quem escolheu o time mais forte já começa em vantagem antes de qualquer troca acontecer.

## Algoritmo

1. Definido um **overall de base** — por enquanto um valor fixo da regra (ex.: 79), não vinculado a nenhuma outra regra do projeto (como o limite de jogadores por overall na composição do elenco).
2. Para cada squad da temporada, soma-se, para todo jogador do elenco com overall acima da base:

   ```
   (overall do jogador − overall de base) × 10
   ```

   Esse é o componente de diferença do mercado tradicional **com cupom aplicado** (zera a taxa progressiva, sobra só a diferença × 10 moedas). O resultado da soma é o `rawCost` do squad.
3. O **teto** da temporada = o maior `rawCost` entre todos os squads.
4. Saldo inicial de cada squad = `teto − rawCost(squad)`.

## Exemplo

- Barcelona: 17 jogadores acima do overall base, soma dos `(overall − base) × 10` = 850 (valor ilustrativo). `rawCost(Barcelona) = 850`.
- Ajax: 2 jogadores acima do overall base, soma = 120. `rawCost(Ajax) = 120`.
- Teto da temporada = `max(850, 120) = 850`.
- Saldo inicial do Barcelona = `850 − 850 = 0`.
- Saldo inicial do Ajax = `850 − 120 = 730`.

## Quando o cálculo roda

Decidido: **uma única vez**, por um gatilho explícito (ex.: "iniciar temporada"), depois que todos os squads da temporada já existem — não é recalculado squad por squad conforme cada participante escolhe seu time, porque o teto depende do conjunto completo. Um squad entrando na temporada depois desse gatilho (ex.: substituição de participante) é um caso ainda não coberto por esta regra.

## Overall de base

Decidido, por enquanto: **valor fixo** da regra, independente de qualquer outro parâmetro do projeto (não é o mesmo número usado numa eventual regra de "máximo de X jogadores com overall Y" na composição do elenco). Pode virar parâmetro do ruleset no futuro.

## Implicação para o ledger

O saldo inicial de cada squad nasce como uma transação `INITIAL` no ledger de moedas, lançada no momento desse gatilho de início de temporada — não na criação do squad individual, já que o valor só pode ser calculado depois que todos os squads da temporada existem.
