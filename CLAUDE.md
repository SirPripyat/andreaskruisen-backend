# andreaskruisen-backend

Back-end de um sistema para gerenciar o campeonato semanal de FIFA/EA FC entre amigos: transferências de jogadores, torneios, escalações, economia de moedas e auditoria de saldo.

Este repositório contém **somente o back-end (API)**. O scraper que coleta jogadores do SoFIFA é um projeto independente e não deve ter código dentro daqui. Back-end e scraper se encontram apenas no banco de dados (e, futuramente, em eventos no RabbitMQ).

## Como o campeonato funciona (regras de negócio)

- Todo fim de semana um grupo de amigos joga FIFA. Cada participante escolhe um time real (ex.: Ajax).
- Existe uma regra de montagem de elenco: limite de X jogadores com determinado overall.
- Cada participante começa o fim de semana com um saldo inicial (hoje, 10 moedas) para contratar.
- **Transferência = troca**: o participante entrega um jogador do seu elenco e recebe outro melhor. Exemplo: sai Brandt (82), entra Dembélé (90); Brandt vai para o time do Dembélé e vice-versa. Custo atual: 8 moedas.
- Custo atual da troca: se o jogador que entra tem overall maior, custa a diferença de overall (90 - 82 = 8). Se for igual ou pior, custa uma taxa de 1 moeda.
- Depois são criados torneios. Conforme avançam de fase ou acumulam vitórias e empates, os participantes ganham moedas. Ao fim de cada torneio, os times são reforçados com essas moedas.
- Necessidade central: **auditoria**, para verificar se alguém gastou mais moedas do que deveria.

## Princípio mais importante: a economia é configurável

Nada da economia pode ser fixo no código. Hoje é "1 moeda por ponto de overall", mas o sistema deve suportar, por exemplo, orçamento em euros com custo baseado em valor de mercado.

- As regras ficam num **ruleset** (JSON validado), associado a uma temporada/rodada: tipo de moeda, orçamento inicial, taxa mínima de transferência, política de preço e tabela de prêmios (por fase, vitória e empate).
- O custo da troca é uma **política de preço** (interface/strategy) que recebe os snapshots do jogador que sai e do que entra e devolve o custo. Implementações previstas: diferença de overall com taxa mínima; diferença de valor de mercado.
- A auditoria **sempre avalia cada operação pelo ruleset vigente na época dela**, nunca pelo atual.

## Decisões de modelagem

- **Ledger append-only de moedas.** O saldo nunca é um campo editável: é a soma das transações (inicial, transferência, prêmio de fase, vitória, empate, ajuste). Transações não são editadas nem apagadas; correções entram como transação de ajuste.
- **Snapshot dos dados do jogador na operação.** O overall e o valor dos jogadores mudam quando o scraper atualiza a base. Por isso toda transferência guarda os valores do momento (overall, valor de mercado) dentro dela, para que o histórico e a auditoria não quebrem.
- **Auditoria** = recalcular os saldos a partir do ledger, revalidar cada transferência com o ruleset da época e apontar divergências (saldo negativo, custo errado, elenco fora da regra).
- Entidades principais: Participante, Temporada/Rodada, Elenco, Jogador, Transferência, Torneio, Fase, Partida, Transação de moedas, Ruleset.

## Stack e arquitetura

- TypeScript, Node, **NestJS**, PostgreSQL.
- ORM: Drizzle ou Prisma (ainda a decidir; confirmar antes de assumir).
- Mensageria: **RabbitMQ** previsto, via `@nestjs/microservices`. Usos planejados: consumir eventos do scraper (ex.: `player.updated`) e processar fechamento de torneio e auditoria de forma assíncrona. Pode vir numa segunda etapa.
- Docker (Dockerfile multi-stage) e `docker-compose` para rodar tudo localmente. Kubernetes (Deployment, Service, ConfigMap/Secret) é usado como laboratório local, com kind ou k3d. Não há necessidade de hospedar em cluster.
- Objetivo de deploy: custo mínimo.
- As regras de negócio (políticas de preço, validação de elenco, cálculo de prêmios) devem ficar num **módulo de domínio puro**, sem dependência do Nest ou do banco, para serem fáceis de testar.

## Convenções para trabalhar neste repositório

- Regras de negócio com testes unitários, principalmente políticas de preço, prêmios e auditoria.
- Controllers finos; a lógica fica em services e no módulo de domínio.
- Validar entradas (DTOs) e o JSON do ruleset.
- Valores monetários em inteiros, sem ponto flutuante, quando fizer sentido para a moeda.
- Migrations versionadas para qualquer mudança no banco.
- Não colocar lógica de scraping neste repositório.
- Em caso de dúvida sobre regra do campeonato, perguntar antes de assumir.

## Ordem de implementação sugerida

1. Estrutura do projeto, Docker/compose com Postgres, módulo de domínio com testes.
2. Participantes, elencos e importação dos jogadores (dados vindos do scraper).
3. Transferências com ledger e validação de saldo e de regras.
4. Torneios, fases, partidas e prêmios automáticos.
5. Auditoria.
6. Mensageria com RabbitMQ.

## Pontos em aberto

- ORM (Drizzle ou Prisma).
- Autenticação: login por participante ou apenas administrador?
- Onde fica o schema do banco compartilhado com o scraper (pacote próprio ou dentro deste repositório).
- Valores exatos dos prêmios por fase, vitória e empate no primeiro ruleset.