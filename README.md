# Rooster One API

## Visão geral

Esta API representa o backend do projeto Rooster One, organizada em módulos de negócio independentes. A matriz de integração com o contrato do frontend está em [docs/contrato-frontend.md](docs/contrato-frontend.md).

## Arquitetura

- NestJS para estrutura da aplicação
- Prisma ORM para persistência
- módulos separados por domínio
- controllers com responsabilidade de entrada/saída
- services com regra de negócio
- DTOs com validação via class-validator

## Estrutura principal

- src/app.module.ts: módulo raiz da aplicação
- src/roster-hub/: módulo do Rooster Hub
- src/rooster-desk/: módulo independente do Rooster Desk
- src/app.module.ts: registra Rooster Hub e Rooster Desk como módulos irmãos
- prisma/schema.prisma: modelo de dados do banco

## Como executar

1. Configure a variável de ambiente DATABASE_URL.
2. Execute a geração do cliente Prisma:
   - npm run prisma:generate
3. Aplique as migrações:
   - npm run prisma:migrate
4. Inicie a aplicação:
   - npm run start:dev
5. Para recriar o banco local de desenvolvimento com dados demonstrativos:
   - npm run db:seed:dev

## Endpoints principais

- /usuarios
- /setores
- /perfis
- /modulos
- /permissoes
- /usuarios-perfis
- /usuarios-setores
- /perfis-permissoes
- /notificacoes
- /sessoes
- /logs-auditoria

### Rooster Desk

O módulo de atendimento e tickets está documentado em [docs/ROOSTER_DESK.md](docs/ROOSTER_DESK.md) e expõe:

- /chamados-categorias
- /chamados-subcategorias
- /chamados-prioridades
- /chamados-status
- /chamados
- /chamados/:id/status
- /mensagens-tickets
- /anexos-tickets
- /historico-tickets
- /avaliacoes-tickets

A documentação interativa fica disponível em `/api/docs` quando o servidor está em execução.

## Cobertura do frontend

O frontend já descreve os módulos Academy, Learn, Rooms, Assets, Finance, Boost
e Student. O backend atualmente implementa Hub e Desk; os demais endpoints estão
registrados como pendentes em [docs/contrato-frontend.md](docs/contrato-frontend.md)
para evitar que a documentação indique uma API inexistente.

## Observações

- O fluxo atual usa RBAC parcial sem JWT/token: o login valida o usuário e o frontend envia o id em `x-user-id`.
- A autorização segue `Usuário -> Perfil -> Permissão -> Módulo/Recurso/Ação`.
- Consulte [docs/rbac.md](docs/rbac.md) para o fluxo completo, exemplos e limitações do modo sem token.
