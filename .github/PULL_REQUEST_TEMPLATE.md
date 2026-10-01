# Alteração e motivação

<!-- Descrever o problema tratado, e não apenas a solução adotada. -->

## Verificação realizada

<!-- Indicar o que foi verificado; a menção genérica a "testado" não é suficiente. -->

- [ ] `npx tsc --noEmit` sem erros (com `dist/tsconfig.tsbuildinfo` removido previamente)
- [ ] `npm test` aprovado
- [ ] `npm run test:e2e` aprovado
- [ ] Verificação manual: <!-- descrever o cenário, inclusive o caso negativo -->

## Impacto na documentação

**Nenhuma alteração de comportamento é integrada sem a documentação correspondente, em registro técnico-formal.**

- [ ] Sem impacto na documentação (justificativa: ____)
- [ ] Documentação atualizada neste pull request

Itens revisados:

- [ ] `database/` e diagramas ER, em caso de alteração de schema ou migration
- [ ] `api/02-endpoints.md` e `backend/04-controllers.md`, em caso de alteração de endpoint
- [ ] `security/03-rbac.md` e `database/06-seeds.md`, em caso de alteração de permissão
- [ ] `system/04-regras-de-negocio.md`, em caso de criação ou alteração de regra de negócio
- [ ] `backend/01-arquitetura.md`, em caso de alteração de dependência
- [ ] **Alguma afirmação de ausência ("não existe", "não implementado") tornou-se incorreta?**
- [ ] **Alguma contagem citada na documentação foi alterada?** (módulos, tabelas, permissões, testes, endpoints)

## Lista de verificação de segurança

- [ ] Rota nova declara `@RequirePermission` (o handler sem o decorator não é restringido pelo guard)
- [ ] Resposta com relação de `Usuario` utiliza `select` explícito, e nunca `include` sem seleção
- [ ] A identidade é obtida do token, e nunca de parâmetro de rota ou do corpo
- [ ] Regra dependente de vínculo com o recurso é verificada no servidor, e não apenas pela ocultação de elementos da interface
- [ ] Gravação em mais de uma tabela ocorre em transação
- [ ] Campo `BigInt` novo possui conversão explícita antes da serialização
- [ ] Rota de upload declara a permissão no guard, verifica a assinatura binária e grava o arquivo cifrado

## Riscos e pontos de atenção

<!-- Aspectos que exigem análise mais cuidadosa do revisor e efeitos colaterais aceitos deliberadamente. -->

## Classe de risco da alteração

- [ ] Baixo (texto, documentação, ajuste visual)
- [ ] Médio (endpoint novo, tela nova, dependência incluída)
- [ ] **Alto** (migration, guard ou autorização, remoção de dependência, transação, tratamento de erro compartilhado), com revisão explícita da lista de verificação de segurança
