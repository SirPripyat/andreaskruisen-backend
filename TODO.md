# TODO: migração para Facade + DTO (request/response)

Padrão alvo (já aplicado em `leagues`, `me`, `players`, `squads`, `transfers`, `users`):

```
Controller → Facade → Use-cases → Repository
dto/
  request/   (schema zod + *RequestDTO)
  response/  (*ResponseDTO)
```

`commons` e `storage` ficam fora da lista: não têm controller/endpoint HTTP.

## Módulos pendentes

- [ ] **auth** — `login`, `logout`, `me`
- [ ] **favorites** — `list`, `add (:playerId)`, `remove (:playerId)`
- [ ] **import** — `players`, `team-formations`, `team-lineups`, `team-crests`, `team-aliases`
- [ ] **matches** — `getMatches`, `getMatchDetail`, `replaceMatchGoals`, `simulateMatch`
- [ ] **nationalities** — `list`, `findOne`, `update`
- [ ] **seasons** — `start`, `findAll`, `getActive`, `findOne`, `update`, `remove`, `select`
- [ ] **teams** — `list`, `findOne`, `getTitles`, `update`
- [ ] **tournaments** — `create`, `list`, `getOne`, `getSituation`, `getFixtures`, `advance (phases)`, `getTopScorers`, `getTopAssists`, `getDashboard`, `update`, `remove`

Cada endpoint acima tende a virar um use-case próprio, seguindo o que foi feito em `players` (ex.: `list` → `ListXUseCase`, `getOne` → `GetXUseCase`).

# TODO: regulamento de transferências v1

Baseado em `docs/regras-temporada/v1-transferencias.md`. Seções 6 e 7 do
`.md`, e "Cláusulas avançadas" dentro da seção 4, são propostas ainda não
validadas pelo grupo — as tasks abaixo continuam listadas, mas podem mudar
ou cair.

## Mercado tradicional (seção 1) — concluído

- [x] Fórmula de custo (diferença de overall × 10 + taxa progressiva), com
      suporte a cupom — `calculateTraditionalMarketTransferCost`
      (`src/transfers/utils/transfer-pricing.utils.ts`)
- [x] Snapshot do overall dos dois jogadores no `Transfer`
      (`outgoingPlayerOverall`/`incomingPlayerOverall`), pra auditoria não
      depender do overall atual do jogador
- [x] `CreateTransferUseCase` chama a função de preço (sem cupom por
      enquanto — isso é tarefa da seção de Cupons) e `TransfersRepository.swap`
      grava uma `CoinTransaction` tipo `TRANSFER` no squad que pediu a troca,
      ligada ao `Transfer` via `transferId`
- [x] Valida saldo suficiente do squad (`findSquadBalance`) antes de
      concluir a transferência — `ConflictException` se insuficiente

## Cupons de isenção (seção 3)

- [x] Modelar cupom no domínio: ledger append-only (`CouponTransaction`),
      mesmo princípio do `CoinTransaction` — saldo nunca é campo editável
- [x] Acúmulo com teto de 4 cupons por squad, sem validade —
      `canGrantCoupon` (`src/transfers/utils/transfer-coupon.utils.ts`) e
      `TransfersRepository.grantCoupon`/`findSquadCouponBalance`
- [x] Ligar `useCoupon` (já existe na função pura) ao fluxo real de
      transferência — `CreateTransferSchema.useCoupon`, validado em
      `ResolveTransferUseCase` (saldo de cupom > 0) e consumido em
      `TransfersRepository.swap` (`CouponTransaction` tipo `USED`);
      `GET /transfers/quote` também expõe `couponBalance`
- [x] Conceder cupom nas negociações diretas (venda, troca, troca com
      compensação) — `resolveNegotiationCouponRecipients`
      (`src/negotiations/utils/direct-negotiation.utils.ts`): só o lado que
      entrega jogador recebe cupom numa venda/compra unilateral, os dois
      lados numa troca

## Negociações entre participantes (seção 2) — concluído (versão básica)

- [x] Fluxo pra negociação direta (compra por moeda, troca sem moeda, troca
      com compensação), sem taxa fixa nem fórmula — módulo `negotiations`
      (`DirectNegotiation`), com aceite explícito do clube convidado
      (`ProposeNegotiationUseCase`/`AcceptNegotiationUseCase`/`RejectNegotiationUseCase`);
      fica `PENDING` até o aceite, nenhum efeito é aplicado antes disso
- [x] Decidir como registrar esse valor livre no ledger pra auditoria —
      `CoinTransaction` tipo `DIRECT_NEGOTIATION`, `amount` livre (sem
      fórmula), ligada à negociação via `directNegotiationId`
- [ ] Cláusulas contratuais anexadas à negociação (seção 4) — fora de
      escopo nesta rodada, ver seção abaixo

## Cláusulas contratuais (seção 4) — concluído (versão básica, sem fiscalização)

Decisão: o sistema não fiscaliza cláusula sozinho, só registra o que foi
acordado pra consulta/auditoria — descumprimento é resolvido entre os
participantes, fora do app (ver seção 5). Por isso não há nenhuma
integração com torneios/partidas/transferências futuras: a cláusula nasce
e morre como dado anexado à negociação.

- [x] Modelar cláusula como entidade própria — `DirectNegotiationClause`
      (`negotiationId`, `type`, `playerId`, `amount`, `matchesCount`,
      `terms`), cobrindo as 4 básicas (lei do ex, direito de recompra,
      preferência de compra, bônus por título); "compensações especiais"
      não é cláusula nova, é o que `outgoingPlayerId`/`incomingPlayerId`/
      `coinAmount` da própria negociação já cobre
- [x] Shape por tipo (ex.: `matchesCount` obrigatório em `LEI_DO_EX`,
      `amount` obrigatório em `DIREITO_DE_RECOMPRA`/`BONUS_POR_TITULO`) —
      `NegotiationClauseInputSchema` (discriminated union por `type`)
- [x] Validar aceite dos dois clubes — já coberto pelo fluxo de
      proposta+aceite da negociação (seção 2): a cláusula só existe
      atrelada a uma proposta, e vale quando o targetSquad aceita a
      negociação como um todo, sem aceite separado por cláusula
- [ ] **Fora de escopo, não implementado:** cláusulas avançadas (rescisão
      automática, intransferível, fidelidade) — ainda não validadas pelo
      grupo; e qualquer fiscalização automática (bloquear partida/oferta,
      auto-aplicar recompra) — decisão explícita de deixar isso manual

## Multas e descumprimento contratual (seção 5)

- [ ] Modelar penalidade por descumprimento de cláusula (formato ainda não
      definido no `.md`)

## Limite de movimentações (seção 6, proposta)

- [ ] Contador de contratações de mercado tradicional por squad por fase
- [ ] Cooldown de jogador recém-negociado pelo mesmo squad

## Fair play financeiro / teto de orçamento (seção 7, proposta)

- [ ] Permitir saldo negativo até um teto, com "juros" descontados na
      próxima premiação
- [ ] Imposto de luxo por overall total do elenco acima de um teto

## Modelagem geral (dos "Pontos em aberto" do `.md`)

- [ ] Decidir onde registrar a nacionalidade do jogador, pro limite de
      jogadores estrangeiros (regra que saiu da versão atual do `.md`, mas
      ainda não resolvida em código)
- [ ] Decidir se o fair play financeiro recalcula o overall total do
      elenco por fase ou usa snapshot
