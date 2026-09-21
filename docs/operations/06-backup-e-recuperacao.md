# Backup e Recuperação

## Estado atual: não identificado no código analisado

Não há nenhuma rotina de backup automatizada em nenhum dos dois repositórios: nenhum script de backup no `package.json` do backend ou do frontend, nenhum job agendado (cron, task agendada, workflow de CI), nenhuma configuração de backup gerenciado do PostgreSQL, e nenhum script de restauração/recuperação de desastre.

Os únicos artefatos relacionados a dados versionados no repositório são:
- As migrations do Prisma (`RoosterOneBackend-main/prisma/migrations/`), que descrevem a evolução do **schema** do banco — não são backup de dados.
- O script de seed (`prisma/seed-dev.ts`), que popula dados de **exemplo** para desenvolvimento — não é backup nem deve ser usado como tal.

**Hoje, a persistência dos dados de produção depende inteiramente de como/onde o PostgreSQL é hospedado** (backup gerenciado pelo provedor, se houver, já que nada no código do repositório cobre isso).

## Recomendação futura

Nada do que segue existe hoje no repositório — são sugestões de baixo esforço, compatíveis com o fato de o banco ser PostgreSQL puro (`prisma/schema.prisma`, `provider = "postgresql"`), caso a equipe decida implementar backup:

### Backup manual/agendado com `pg_dump`

```bash
pg_dump --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump "$DATABASE_URL"
```

- Pode ser agendado via cron (Linux) ou Agendador de Tarefas (Windows) rodando esse comando periodicamente contra a `DATABASE_URL` de produção.
- Recomenda-se reter os dumps fora do próprio servidor do banco (armazenamento separado) e testar a restauração periodicamente — um backup nunca testado não deve ser considerado confiável.

### Restauração a partir de um dump

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup_20260101_000000.dump
```

### Itens em aberto para uma estratégia real de backup

- Definir frequência (ex.: diário) e política de retenção (quantas cópias manter, por quanto tempo).
- Definir onde os dumps ficam armazenados (fora do mesmo host do banco).
- Definir e testar o procedimento de restauração (RTO/RPO) — hoje nenhum dos dois existe documentado ou automatizado.
- Considerar backup gerenciado, se o PostgreSQL de produção vier a ser hospedado em um provedor que já ofereça essa capacidade nativamente.

Reforçando: tudo nesta seção é sugestão, não descreve nenhuma automação existente no código dos repositórios.
