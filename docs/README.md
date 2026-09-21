# Documentação — Rooster One

Índice central da documentação do sistema. O Rooster One é composto por dois repositórios independentes:

- **Backend** (este repositório, `RoosterOneBackend-main`) — API NestJS + Prisma + PostgreSQL. Contém a documentação de sistema, backend, API, banco de dados, segurança, engenharia, operações e guias.
- **Frontend** (`RoosterOneFrontEnd-main`) — TanStack Start + React. Contém sua própria documentação em [`docs/frontend/`](../../RoosterOneFrontEnd-main/docs/frontend/01-arquitetura.md) dentro do repositório do frontend.

Toda a documentação foi reconstruída a partir do estado real do código (setembro/2026) — a documentação anterior foi removida por estar desatualizada frente ao sistema atual. Ver auditoria completa em [`engineering/11-auditoria-documentacao.md`](engineering/11-auditoria-documentacao.md).

## Sistema

- [Visão Geral](system/01-visao-geral.md)
- [Escopo](system/02-escopo.md)
- [Funcionalidades](system/03-funcionalidades.md)
- [Regras de Negócio](system/04-regras-de-negocio.md)
- [Fluxos do Sistema](system/05-fluxos-do-sistema.md)
- [Glossário](system/06-glossario.md)

## Frontend

Documentação completa no repositório do frontend: [`RoosterOneFrontEnd-main/docs/frontend/`](../../RoosterOneFrontEnd-main/docs/frontend/01-arquitetura.md) — arquitetura, estrutura, páginas e rotas, componentes, estado e hooks, integração com a API, autenticação, autorização, validações, tratamento de erros, guia do desenvolvedor.

## Backend

- [Arquitetura](backend/01-arquitetura.md)
- [Estrutura](backend/02-estrutura.md)
- [Módulos](backend/03-modulos.md)
- [Controllers](backend/04-controllers.md)
- [Services](backend/05-services.md)
- [Repositories](backend/06-repositories.md)
- [Middlewares](backend/07-middlewares.md)
- [Validações](backend/08-validacoes.md)
- [Autenticação](backend/09-autenticacao.md)
- [Autorização / RBAC](backend/10-autorizacao-rbac.md)
- [Tratamento de Erros](backend/11-tratamento-erros.md)
- [Logs](backend/12-logs.md)
- [Guia do Desenvolvedor](backend/13-guia-desenvolvedor.md)

## API

- [Visão Geral](api/01-visao-geral.md)
- [Endpoints](api/02-endpoints.md)
- [Autenticação](api/03-autenticacao.md)
- [Erros](api/04-erros.md)
- [Exemplos](api/05-exemplos.md)

## Banco de Dados

- [Arquitetura](database/01-arquitetura.md)
- [Entidades](database/02-entidades.md)
- [Relacionamentos](database/03-relacionamentos.md) (inclui diagrama ER)
- [Migrations](database/04-migrations.md)
- [Índices e Constraints](database/05-indices-e-constraints.md)
- [Seeds](database/06-seeds.md)

## Segurança

- [Autenticação](security/01-autenticacao.md)
- [Autorização](security/02-autorizacao.md)
- [RBAC](security/03-rbac.md)
- [Segurança da Aplicação](security/04-seguranca-aplicacao.md)
- [Análise de Segurança](security/05-analise-de-seguranca.md)

## Engenharia

- [Arquitetura Geral](engineering/01-arquitetura-geral.md)
- [Diagramas](engineering/02-diagramas.md)
- [Decisões Arquiteturais](engineering/03-decisoes-arquiteturais.md)
- [Padrões e Convenções](engineering/04-padroes-e-convencoes.md)
- [Fluxos Técnicos](engineering/05-fluxos-tecnicos.md)
- [Integrações](engineering/06-integracoes.md)
- [Rastreabilidade](engineering/07-rastreabilidade.md)
- [Dívida Técnica](engineering/08-divida-tecnica.md)
- [Performance](engineering/09-performance.md)
- [Melhorias Futuras](engineering/10-melhorias-futuras.md)
- [Auditoria da Documentação](engineering/11-auditoria-documentacao.md)

## Operações

- [Configuração](operations/01-configuracao.md)
- [Instalação](operations/02-instalacao.md)
- [Execução](operations/03-execucao.md)
- [Deploy](operations/04-deploy.md)
- [CI/CD](operations/05-cicd.md)
- [Backup e Recuperação](operations/06-backup-e-recuperacao.md)
- [Troubleshooting](operations/07-troubleshooting.md)

## Guias

- [Guia do Usuário](user-guides/01-guia-do-usuario.md)
- [Guia do Administrador](user-guides/02-guia-do-administrador.md)
