-- Migration de DADOS (sem mudança de estrutura): cria a permissão "Acessar" de sete telas que o
-- frontend exige para a entrada (useCanAccess / RequireAccess), mas que não constavam do catálogo
-- de permissões do banco: Reservar, Minhas reservas, Gerenciar reservas e Estrutura física
-- (Rooms), Categorias e Atendentes (Desk) e Patrimônio (Assets). Sem elas, o usuário que podia,
-- por exemplo, solicitar reservas recebia "Acesso negado" na tela Reservar.
--
-- Cada permissão é concedida a quem já possui alguma ação da mesma tela; a de "Minhas reservas" é
-- concedida também a quem pode solicitar reserva, para que o solicitante acompanhe os pedidos.
-- Idempotente: pode rodar de novo sem duplicar nada (a coluna "nome" não é única, por isso
-- NOT EXISTS na criação e ON CONFLICT na concessão).

WITH novas ("nome", "base", "descricao") AS (
  VALUES
    ('rooms.book.acessar',          'rooms.book.solicitar',              'Acessar reserva de ambientes'),
    ('rooms.reservations.acessar',  'rooms.reservations.mensagem',       'Acessar minhas reservas'),
    ('rooms.manage.acessar',        'rooms.manage.aprovar',              'Acessar gestão de reservas'),
    ('rooms.structure.acessar',     'rooms.structure.criar',             'Acessar estrutura física'),
    ('desk.categories.acessar',     'desk.categories.criar',             'Acessar categorias'),
    ('desk.team.acessar',           'desk.team.vincular-categoria',      'Acessar atendentes'),
    ('assets.inventory.acessar',    'assets.inventory.criar',            'Acessar patrimônio')
)
INSERT INTO "permissoes" ("id", "modulo_id", "nome", "descricao", "recurso", "acao", "criado_em")
SELECT gen_random_uuid(), base."modulo_id", novas."nome", novas."descricao", base."recurso", 'acessar', NOW()
FROM novas
JOIN LATERAL (
  SELECT p."modulo_id", p."recurso" FROM "permissoes" p WHERE p."nome" = novas."base" LIMIT 1
) base ON TRUE
WHERE NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "nome" = novas."nome");

-- Permissões criadas anteriormente pela tela "Acessos e permissões" (criação sob demanda) ficaram
-- sem módulo vinculado; o módulo é preenchido a partir de outra permissão da mesma tela.
UPDATE "permissoes" p
SET "modulo_id" = (
  SELECT q."modulo_id" FROM "permissoes" q
  WHERE q."recurso" = p."recurso" AND q."modulo_id" IS NOT NULL
  LIMIT 1
)
WHERE p."modulo_id" IS NULL AND p."recurso" IS NOT NULL;

-- Concede "acessar" a quem possui qualquer ação da mesma tela.
INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", acesso."id", NOW()
FROM "permissoes" acesso
JOIN "permissoes" acao ON acao."recurso" = acesso."recurso" AND acao."id" <> acesso."id"
JOIN "usuarios_permissoes" up ON up."permissao_id" = acao."id"
WHERE acesso."nome" IN (
  'rooms.book.acessar', 'rooms.reservations.acessar', 'rooms.manage.acessar', 'rooms.structure.acessar',
  'desk.categories.acessar', 'desk.team.acessar', 'assets.inventory.acessar'
)
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;

-- Quem pode solicitar reserva acompanha os próprios pedidos em "Minhas reservas".
INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", acesso."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" solicitar ON solicitar."id" = up."permissao_id" AND solicitar."nome" = 'rooms.book.solicitar'
JOIN "permissoes" acesso ON acesso."nome" = 'rooms.reservations.acessar'
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;
