# Regulamento de Transferências — v1.0 (+ extensões propostas)

> Regra de negócio proposta para uma temporada/ruleset. Ainda não implementada no código — serve como insumo para o `ruleset` (política de preço + benefícios + restrições de elenco).
>
> Seções 1 a 6 são o regulamento original do grupo. As seções 7 e 8, e a subseção "Cláusulas avançadas" dentro da seção 4, são **extensões propostas, ainda não validadas pelo grupo** — ficam aqui já integradas porque sobreviveram a uma primeira curadoria, mas podem ser descartadas ou ajustadas antes de virarem ruleset de verdade.

## 1. Mercado tradicional

As contratações realizadas no mercado tradicional funcionam por meio da troca de jogadores e do pagamento de moedas.

- Cada ponto de diferença positiva de overall custa **10 moedas**.
- O jogador contratado entra no clube comprador.
- O jogador utilizado na troca é transferido para o clube de origem do jogador contratado.
- Toda contratação está sujeita à taxa progressiva.

### Taxas progressivas

| Diferença de overall | Taxa |
|---|---:|
| 0 a 2 pontos | 10 moedas |
| 3 a 5 pontos | 20 moedas |
| 6 a 8 pontos | 30 moedas |
| 9 pontos ou mais | 50 moedas |

**Cálculo:** `(diferença de overall × 10) + taxa progressiva`

**Exemplo:** trocar um jogador 80 por um jogador 90 custa 100 moedas de diferença + 50 de taxa, totalizando **150 moedas**.

## 2. Negociações entre clubes participantes

Os participantes poderão negociar livremente jogadores entre seus clubes, sem utilizar obrigatoriamente o sistema de troca do mercado tradicional.

As negociações podem envolver:

- Compra direta utilizando moedas.
- Troca de jogadores sem moedas.
- Troca de jogadores com compensação em moedas.
- Inclusão de cláusulas contratuais especiais.

Não há preços fixos nem taxa progressiva nas negociações diretas entre os participantes. Todas as condições dependem do acordo entre os clubes.

## 3. Benefícios de transferência — Cupons de isenção

Para incentivar as negociações entre participantes, serão concedidos cupons de isenção de taxa.

- **Venda por moedas:** o clube vendedor recebe 1 cupom.
- **Troca entre clubes:** ambos os clubes recebem 1 cupom.
- **Troca com jogadores e moedas:** ambos recebem 1 cupom.
- Cada clube poderá acumular até **4 cupons**.
- Os cupons não possuem prazo de validade.
- Cada cupom elimina a taxa progressiva de uma contratação no mercado tradicional.
- Somente 1 cupom poderá ser utilizado por contratação.

O cupom elimina apenas a taxa, não o custo correspondente à diferença de overall.

**Exemplo:** uma contratação de overall 80 para 90 normalmente custa 150 moedas. Utilizando um cupom, custará apenas 100 moedas.

## 4. Contratos e cláusulas especiais

Os participantes poderão estabelecer cláusulas personalizadas durante as negociações.

Entre as possibilidades estão:

- **Lei do ex:** proibir que um jogador enfrente seu antigo clube durante determinado número de partidas.
- **Direito de recompra:** estabelecer condições para o antigo clube recuperar o jogador.
- **Preferência de compra:** dar prioridade ao antigo clube em uma negociação futura.
- **Bônus por títulos:** pagamento adicional se o clube comprador conquistar determinado campeonato.
- **Compensações especiais:** inclusão de jogadores, moedas ou outras condições acordadas.

As cláusulas precisam ser aceitas pelos dois clubes antes da conclusão da transferência.

### Cláusulas avançadas (proposta, ainda em discussão)

- **Cláusula de rescisão automática:** valor fixo que qualquer outro clube pode pagar para "destravar" o jogador direto, sem precisar negociar com o clube atual (tipo cláusula de liberação do futebol real).
- **Jogador intransferível:** clube pode marcar até N jogadores do elenco como intransferíveis por uma fase — bloqueia qualquer oferta, inclusive do mercado tradicional.
- **Fidelidade:** jogador que completa N fases consecutivas no mesmo clube reduz a taxa progressiva de uma eventual saída futura (recompensa quem não gira o elenco toda hora).

## 5. Multas e descumprimento contratual

As multas e penalidades serão negociadas livremente entre os participantes.

Os clubes poderão estabelecer penalidades financeiras ou esportivas para o descumprimento de cláusulas.

Depois de firmado o acordo, nenhuma das partes poderá alterar unilateralmente suas condições.

## 6. Limite de movimentações (proposta, ainda em discussão)

- **Número máximo de contratações por clube por fase** (ex.: 2 trocas de mercado tradicional por fase do torneio). Negociações diretas entre participantes não contam no limite.
- **Cooldown de jogador:** um jogador que acabou de ser negociado não pode ser negociado de novo pelo mesmo clube por N dias/fases — evita "ida e volta" para lavar taxa de overall.

## 7. Fair play financeiro / teto de orçamento (proposta, ainda em discussão)

- **Saldo negativo permitido até um limite** (ex.: até -20 moedas), com "juros": cada fase que o clube fica no vermelho, perde X moedas extras no próximo prêmio recebido.
- **Imposto de luxo:** clube cujo elenco somado de overall está acima de um teto paga uma taxa extra em qualquer contratação de mercado tradicional (desestimula o "rico fica mais rico").

---

**Objetivo do regulamento:** valorizar as negociações entre participantes, incentivar a movimentação de jogadores, criar vantagens para compradores e vendedores e manter uma economia competitiva durante a liga.

## Exemplos adicionais de cálculo

### Mercado tradicional (sem cupom)

| Jogador sai → entra | Diferença | Cálculo | Custo total |
|---|---:|---|---:|
| 85 → 86 | 1 | 1×10 + 10 | 20 |
| 85 → 87 | 2 | 2×10 + 10 | 30 |
| 85 → 88 | 3 | 3×10 + 20 | 50 |
| 85 → 90 | 5 | 5×10 + 20 | 70 |
| 85 → 91 | 6 | 6×10 + 30 | 90 |
| 85 → 93 | 8 | 8×10 + 30 | 110 |
| 75 → 90 | 15 | 15×10 + 50 | 200 |
| 90 → 88 (downgrade) | 0 (negativo → 0) | 0×10 + 10 | 10 |
| 85 → 85 (mesmo overall) | 0 | 0×10 + 10 | 10 |

### Mercado tradicional (com cupom)

O cupom zera só a taxa, não a diferença de overall.

| Jogador sai → entra | Sem cupom | Com cupom |
|---|---:|---:|
| 85 → 88 (diff 3) | 50 | 30 |
| 75 → 90 (diff 15) | 200 | 150 |
| 90 → 88 (downgrade) | 10 | 0 |

### Negociações entre participantes (sem regra fixa)

- **Compra direta:** Clube A paga 50 moedas ao Clube B por um jogador, sem entregar nenhum jogador em troca. Clube B (vendedor) ganha 1 cupom.
- **Troca pura sem moedas:** Clube A troca o lateral X pelo atacante Y do Clube B, sem nenhuma moeda envolvida, overalls quaisquer. Ambos ganham 1 cupom.
- **Troca com compensação:** Clube A entrega o meia X + 15 moedas e recebe o atacante Y do Clube B. Ambos ganham 1 cupom.
- **Venda parcelada/condicional** (cabe em "cláusulas especiais", não prevista explicitamente no texto base): Clube A paga 30 moedas agora e mais 20 se o jogador atingir X partidas — precisa virar cláusula contratual aceita por ambos.

### Cupons — acúmulo e uso

- Clube com 2 cupons faz uma venda por moedas → ganha +1 = 3 cupons.
- Clube com 4 cupons (limite) faz uma troca → cupom extra é perdido, continua com 4.
- Clube usa 1 cupom numa contratação de diff 6 (normalmente 90 moedas) → paga só 60 (6×10), economiza a taxa de 30.
- Não é possível usar 2 cupons na mesma contratação para, por exemplo, zerar taxa e reduzir diferença — somente 1 cupom por contratação, e ele só afeta a taxa.

### Cláusulas contratuais (exemplos de combinações)

- **Lei do ex + recompra:** Clube A vende um atacante ao Clube B por 40 moedas, com cláusula de que o jogador não pode enfrentar o Clube A nas próximas 3 partidas, e o Clube A pode recomprá-lo por 50 moedas até o fim da temporada.
- **Bônus por título:** Clube B paga 20 moedas na troca + 30 moedas extras se vencer o torneio da fase atual.
- **Preferência de compra:** Clube A troca um jogador vinculado à cláusula de que, se o Clube B decidir vendê-lo no futuro, o Clube A tem prioridade de negociação.

### Limite de movimentações (exemplos)

- Clube já fez 2 trocas de mercado tradicional nesta fase (limite atingido) → terceira troca bloqueada até a próxima fase. Uma negociação direta com outro participante continua liberada, pois não conta no limite.
- Jogador foi negociado na fase 3 com cooldown de 2 fases → o mesmo clube só pode negociá-lo de novo a partir da fase 5.

### Fair play financeiro (exemplos)

- Clube está em -15 moedas (dentro do limite de -20 permitido) → no próximo prêmio recebido, perde X moedas extras de "juros" por ter ficado no vermelho.
- Clube com overall total do elenco acima do teto definido no ruleset paga +X moedas extras em qualquer contratação de mercado tradicional (imposto de luxo), além do cálculo normal de diferença + taxa.

### Cláusulas avançadas (exemplos)

- **Rescisão automática:** jogador tem cláusula de rescisão de 60 moedas — qualquer clube pode pagar esse valor direto ao clube atual para destravá-lo, sem precisar negociar.
- **Intransferível:** Clube marca seu atacante titular como intransferível na fase 4 — nenhuma oferta, nem do mercado tradicional, pode ser aceita até a fase seguinte.
- **Fidelidade:** jogador completa 4 fases seguidas no mesmo clube → uma eventual venda futura dele tem a taxa progressiva reduzida em uma faixa (ex.: de "30 moedas" para "20 moedas").

## Pontos em aberto para modelagem

- Como representar cupons no domínio: campo de saldo no clube/elenco, ou como transação no ledger (análoga a moedas, mas com unidade própria)?
- Negociações diretas entre participantes (seção 2) não têm preço fixo — como registrar o custo no ledger para fins de auditoria, já que o valor é livre?
- Cláusulas contratuais (seções 4 e "Cláusulas avançadas") e multas (seção 5) implicam estado condicional de longo prazo (ex.: "não pode jogar contra X por 3 partidas", "intransferível até a fase Y") — isso é regra de negócio nova além de preço, precisa de modelagem própria (não cabe só na política de preço).
- Limite de estrangeiros (seção 6) e limite de movimentações (seção 7) são regras de validação de elenco/cadência, não de preço — onde registrar "nacionalidade" do jogador (dado do scraper?) e o histórico de movimentações por fase?
- Fair play financeiro (seção 8) depende de acompanhar o overall total do elenco ao longo do tempo, não só no momento da transferência — precisa decidir se isso é recalculado a cada fase ou mantido como snapshot.
