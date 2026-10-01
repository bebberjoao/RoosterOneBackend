# Rooster One API

Backend do Rooster One, sistema de gestão institucional para instituições de ensino, desenvolvido com NestJS,
Prisma e PostgreSQL.

Documentação completa: [docs/README.md](docs/README.md).

## Início rápido

```bash
npm install
cp .env.example .env          # preencher DATABASE_URL, JWT_SECRET e FILE_ENCRYPTION_KEY
npm run prisma:generate
npm run prisma:migrate
npm run db:seed:dev           # dados de demonstração (apaga o banco de desenvolvimento)
npm run start:dev             # http://localhost:3000, Swagger em /api/docs
```

Instalação, configuração, execução, implantação e cópias de segurança: [docs/operations/](docs/operations/).

## Testes

```bash
npm test            # testes unitários
npm run test:e2e    # testes e2e (SQLite isolado)
```
