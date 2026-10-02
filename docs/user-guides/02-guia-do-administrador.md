# Guia do Administrador — Rooster One

Guia destinado a quem gerencia usuários, setores, permissões e a configuração dos módulos do Rooster One. O
administrador não corresponde a cargo fixo no sistema: é todo usuário que recebeu a permissão de gerenciar
permissões (ver "Concessão de acesso de administrador"). O procedimento detalhado consta do Manual do Usuário.

## Gestão de usuários (Rooster Hub → Usuários)

- **Criação**: nome, e-mail e senha inicial (mínimo de 8 caracteres). O e-mail deve ser único no sistema.
- **Redefinição de senha**: na lista de usuários, a opção de redefinição (ícone de chave) define nova senha. O
  usuário não é avisado automaticamente por e-mail, e a comunicação deve ocorrer por canal separado. As sessões
  abertas do usuário são encerradas.
- **Desativação**: recomenda-se a desativação, em lugar da exclusão, quando houver interesse em preservar o
  histórico do usuário (chamados, reservas etc.). O usuário desativado perde o acesso de imediato.
- **Proteção do último administrador**: o sistema recusa a exclusão, a desativação e a revogação da permissão de
  administrador do último administrador ativo.

## Gestão de setores (Rooster Hub → Setores)

O setor é a unidade utilizada para restringir o que atendentes e coordenadores visualizam; por exemplo, o chamado é
exibido apenas aos integrantes do setor responsável pela categoria. Cada usuário deve ser vinculado aos setores
correspondentes à sua função.

## Acessos e permissões (Rooster Hub → Acessos e permissões)

- A permissão é concedida diretamente ao usuário; não há cargo com conjunto predefinido de permissões. Cada
  permissão combina módulo, tela e ação (por exemplo, "Rooster Desk / Chamados / Encerrar").
- **Concessão de acesso de administrador**: concessão da permissão "Rooster Hub / Acessos e permissões / Gerenciar
  permissões". A partir dela, o sistema trata o usuário como administrador, com acesso irrestrito, sem outra
  configuração.
- Recomenda-se a revisão periódica dos usuários com essa permissão, por ser a concessão mais sensível do sistema.
- **Relatórios**: na mesma tela, os usuários com as permissões correspondentes consultam e exportam em CSV o
  relatório de auditoria (com o autor de cada ação) e o relatório de erros do servidor.

## Configurações (Configurações → E-mail)

Exibe o estado do envio de e-mail (SMTP) e permite o envio de mensagem de teste. As credenciais do servidor de
e-mail são definidas no arquivo de configuração do servidor, e não pela interface.

## Categorias e equipe de atendimento (Rooster Desk)

Cada categoria de chamado é vinculada a um setor; os atendentes devem ser vinculados às subcategorias para que a
atribuição de chamados funcione corretamente. A exibição do SLA depende da permissão "ver SLA".

## Estrutura física (Rooster Rooms)

Campus, blocos e ambientes devem ser cadastrados antes de qualquer reserva. Cada ambiente possui capacidade, dias de
funcionamento e janela de horário; reservas fora desses limites são recusadas automaticamente. As permissões de prazo
estendido e de reserva recorrente devem ser concedidas apenas aos usuários que delas necessitem.

## Patrimônio (Rooster Assets)

Categorias e setores de patrimônio devem ser cadastrados antes dos itens. No registro de empréstimo, deve-se definir
o prazo de devolução; o item passa a constar automaticamente da relação de "Empréstimos atrasados" do painel caso o
prazo expire sem devolução registrada.

## Estrutura acadêmica (Rooster Academy)

A ordem recomendada de cadastro é: cursos, período letivo, disciplinas, vínculos de professor e de aluno (a partir de
usuários existentes no Hub), turmas e matrículas. A matrícula respeita a capacidade da turma.

## Cursos extracurriculares (Rooster Boost)

A gestão dos cursos é realizada por permissão, sem responsável exclusivo por curso: quem possui a permissão de
gestão atua sobre todos os cursos. Os professores são vinculados como orientadores, apenas para a comunicação com os
alunos. A tela "Alunos do portal" permite cadastrar alunos externos (com senha informada ou senha temporária, exibida
uma única vez), editar nome e e-mail, desativar e reativar contas, excluir conta sem matrícula e gerar senha
temporária. Os alunos da instituição acessam o portal com a conta institucional, sem cadastro adicional, e são
matriculados nos cursos pela aba "Alunos" da gestão do curso (permissão `boost.manage.matricular`).

## Financeiro (Rooster Finance)

O cadastro de serviços (inclusive a mensalidade), produtos, descontos e políticas de multa e juros precede a geração
de cobranças. A geração de mensalidades em lote é idempotente e pode ser repetida com segurança. Boleto e nota fiscal
são documentos internos, sem integração bancária nem validade fiscal.

## Auditoria

Login, renovação de sessão, criação, edição e exclusão de usuário, concessão e revogação de permissão, redefinição de
senha, lançamento de notas, transições de cobrança e gestão de contas externas do Boost são registrados
automaticamente, com o autor da ação, e constam do relatório de auditoria e da "Atividade recente" do painel do
Rooster Hub; não há registro manual.
