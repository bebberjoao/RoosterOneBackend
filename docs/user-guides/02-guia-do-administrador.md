# Guia do Administrador — Rooster One

Guia para quem gerencia usuários, setores e permissões no Rooster One. "Administrador" aqui não é um cargo fixo no sistema — é qualquer usuário que tenha recebido a permissão de gerenciar permissões (ver "Como conceder acesso de administrador" abaixo).

## Gestão de usuários (Rooster Hub → Usuários)

- **Criar usuário**: informe nome, e-mail e uma senha inicial. O e-mail precisa ser único no sistema.
- **Redefinir a senha de um usuário**: na lista de usuários, clique no ícone de chave ao lado do usuário e defina a nova senha. O usuário não é avisado automaticamente por e-mail dessa ação — se precisar informá-lo, faça isso por um canal separado.
- **Desativar usuário**: em vez de excluir, prefira marcar como inativo quando fizer sentido manter o histórico do usuário (chamados abertos, reservas feitas por ele, etc.).

## Gestão de setores (Rooster Hub → Setores)

Setor é a unidade usada para restringir o que um atendente ou coordenador enxerga — por exemplo, um chamado só aparece para quem está no setor responsável pela categoria daquele chamado. Vincule cada usuário ao(s) setor(es) correspondente(s) à função dele.

## Gestão de acessos e permissões (Rooster Hub → Acessos e permissões)

- Permissão é concedida direto ao usuário — não existe um "cargo" com um pacote pronto de permissões. Cada permissão concedida é uma combinação de módulo + tela + ação (ex.: "Rooster Desk / Chamados / Encerrar").
- **Como conceder acesso de administrador**: conceda ao usuário a permissão "Rooster Hub / Acessos e permissões / Gerenciar permissões". A partir disso, o sistema passa a tratar esse usuário como administrador (acesso irrestrito), sem precisar de nenhum outro campo ou configuração.
- Revise periodicamente quem tem essa permissão — é a concessão mais sensível do sistema.

## Categorias e equipe de atendimento (Rooster Desk)

Cada categoria de chamado é vinculada a um setor; vincule atendentes às subcategorias para que a atribuição de chamados funcione corretamente.

## Estrutura física (Rooster Rooms)

Cadastre campus, blocos e ambientes antes que qualquer reserva possa ser feita. Cada ambiente tem capacidade, dias de funcionamento e janela de horário — reservas fora desses limites são recusadas automaticamente pelo sistema.

## Patrimônio (Rooster Assets)

Cadastre categorias e setores de patrimônio antes de cadastrar itens. Ao registrar um empréstimo, defina o prazo de devolução — o item aparece automaticamente na lista de "Empréstimos atrasados" no painel se o prazo passar sem devolução registrada.

## Auditoria

Login, criação/edição/exclusão de usuário, concessão/revogação de permissão e redefinição de senha ficam registrados automaticamente em "Atividade recente", no painel do Rooster Hub — não é preciso registrar nada manualmente.
