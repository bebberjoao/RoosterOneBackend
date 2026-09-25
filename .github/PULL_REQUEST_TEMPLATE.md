# O que muda e por quê

<!-- Qual problema isso resolve? Descreva o problema, não só a solução. -->

## Como foi verificado

<!-- Não basta "testei". Diga o quê. -->

- [ ] `npx tsc --noEmit` limpo (com `dist/tsconfig.tsbuildinfo` apagado antes)
- [ ] `npm run test:e2e` passando
- [ ] Testado manualmente: <!-- descreva o cenário, incluindo o caso negativo -->

## Impacto na documentação

**Nenhuma mudança de comportamento entra sem a documentação correspondente.**

- [ ] Não há impacto na documentação (justifique: ____)
- [ ] Documentação atualizada neste mesmo PR

Marque o que foi revisado:

- [ ] `database/` + ERD — se mexeu em schema ou migration
- [ ] `api/02-endpoints.md` + `backend/04-controllers.md` — se mexeu em endpoint
- [ ] `security/03-rbac.md` + `database/06-seeds.md` — se mexeu em permissão
- [ ] `system/04-regras-de-negocio.md` — se criou ou mudou regra de negócio
- [ ] `backend/01-arquitetura.md` — se mexeu em dependência
- [ ] **Alguma afirmação de ausência ("não existe", "não implementado") ficou desatualizada?**
- [ ] **Alguma contagem citada na documentação mudou?** (módulos, tabelas, permissões, testes, endpoints)

## Checklist de segurança

- [ ] Rota nova declara `@RequirePermission` (handler sem o decorator passa livre pelo guard)
- [ ] Resposta com relação de `Usuario` usa `select` explícito, nunca `include` cru
- [ ] Identidade vem do token, nunca de parâmetro de rota ou do corpo
- [ ] Regra que depende de posse é checada no servidor, não só escondendo o botão
- [ ] Escrita em mais de uma tabela está em transação
- [ ] Campo `BigInt` novo tem conversão explícita antes de serializar

## Riscos e pontos de atenção

<!-- O que o revisor deve olhar com mais cuidado? Que efeito colateral você aceitou conscientemente? -->

## Classe de risco da mudança

- [ ] Baixo (texto, documentação, ajuste visual)
- [ ] Médio (endpoint novo, tela nova, dependência acrescentada)
- [ ] **Alto** (migration, guard/autorização, remoção de dependência, transação) — exige revisão explícita do checklist de segurança
