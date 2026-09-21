# CI/CD

## Estado atual: não identificado no código analisado

Não há integração contínua nem entrega contínua configurada em nenhum dos dois repositórios. Confirmado por varredura direta:

- Não existe pasta `.github/workflows` (nem qualquer outro diretório de workflows) em `RoosterOneBackend-main` nem em `RoosterOneFrontEnd-main`.
- Não há configuração de outras ferramentas de CI comuns (`.gitlab-ci.yml`, `azure-pipelines.yml`, `.circleci/`, `Jenkinsfile`, `bitbucket-pipelines.yml`) em nenhum dos repositórios.
- Não há hooks de Git versionados (ex.: Husky) configurando checagens automáticas antes de push/commit.

**Não há, portanto, nenhuma pipeline que rode testes, lint ou build automaticamente a cada commit/PR.** Toda validação (`npm run test:e2e`, `npm run lint`, `npm run build`) precisa ser executada manualmente por quem está desenvolvendo, antes de integrar ou publicar código.

## Recomendação futura

Não existe hoje nenhum arquivo de workflow no repositório — o que segue é apenas uma sugestão de estrutura mínima, baseada nos scripts já existentes em cada `package.json`, caso a equipe decida adotar CI/CD no futuro:

- **Backend**: workflow que rode `npm install`, `npm run prisma:generate` e `npm run test:e2e` a cada push/PR (o `test:e2e` já é auto-contido — usa SQLite local via `cross-env`, não exige um PostgreSQL externo no runner).
- **Frontend**: workflow que rode `npm install`, `npm run lint` e `npm run build` a cada push/PR.
- Deploy automatizado só faria sentido depois de definir a infraestrutura alvo — ver o gap equivalente em `04-deploy.md`.

Isso é uma recomendação, não uma descrição do estado atual do projeto.
