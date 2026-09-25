-- Migration de DADOS (sem mudança de estrutura): cria a permissão "Visualizar SLA" do Desk e a
-- concede a quem já acessa a tela de chamados, para ninguém perder de repente o campo de SLA.
-- Depois disso o administrador pode retirá-la de quem não deve ver (Hub > Acessos).
-- Idempotente: pode rodar de novo sem duplicar nada.

INSERT INTO "permissoes" ("id", "modulo_id", "nome", "descricao", "recurso", "acao", "criado_em")
SELECT gen_random_uuid(), base."modulo_id", 'desk.tickets.ver-sla', 'Visualizar SLA', base."recurso", 'ver-sla', NOW()
FROM "permissoes" base
WHERE base."nome" = 'desk.tickets.acessar'
  AND NOT EXISTS (SELECT 1 FROM "permissoes" WHERE "nome" = 'desk.tickets.ver-sla');

INSERT INTO "usuarios_permissoes" ("id", "usuario_id", "permissao_id", "criado_em")
SELECT gen_random_uuid(), up."usuario_id", nova."id", NOW()
FROM "usuarios_permissoes" up
JOIN "permissoes" acesso ON acesso."id" = up."permissao_id" AND acesso."nome" = 'desk.tickets.acessar'
JOIN "permissoes" nova ON nova."nome" = 'desk.tickets.ver-sla'
ON CONFLICT ("usuario_id", "permissao_id") DO NOTHING;
