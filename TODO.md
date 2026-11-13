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
