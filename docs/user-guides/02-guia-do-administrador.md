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

## Assistente de dúvidas e roteiros guiados

- O assistente está disponível a todos os usuários, sem permissão específica, e responde com o conteúdo do Manual do
  Usuário. O roteiro guiado de cada tarefa, porém, é oferecido somente a quem possui a permissão da tarefa (por
  exemplo, "Rooster Desk / Chamados / Abrir chamado" para o roteiro de abertura de chamado); a concessão da permissão
  em Acessos e permissões libera também o roteiro.
- O conteúdo das respostas acompanha o Manual do Usuário. Após a alteração do manual
  (`docs/manual-usuario/manual.json`), a equipe técnica regenera o documento Word (`npm run manual`) e a base de
  conhecimento do assistente (`npm run assistente:base`).

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

A ordem recomendada de cadastro, toda em Rooster Academy → Gestão acadêmica, é: cursos (aba Cursos), período letivo
(aba Calendário → Períodos letivos), disciplinas, vínculos de professor e de aluno (a partir de usuários existentes no
Hub), turmas e matrículas (aba Turmas → abrir a turma → Matrículas). A matrícula respeita a capacidade da turma; a
capacidade 0 indica turma sem limite de vagas.

Ao vincular um usuário como **professor** ou como **aluno**, o sistema concede a ele as permissões padrão do papel
(as telas do professor no Academy e no Learn, ou o portal do aluno), de modo que ele já pode entrar e trabalhar, sem
concessão manual em Acessos. Permissões adicionais continuam sendo concedidas em Rooster Hub → Acessos; a exclusão do
vínculo não revoga as permissões, que devem ser retiradas em Acessos, se for o caso.

Regras que o sistema aplica ao controle de notas e de frequência (detalhes em `docs/system/04-regras-de-negocio.md`,
RN020 a RN027):

- **Matrícula**: turma cheia, turma encerrada e aluno com cadastro não ativo recusam a matrícula. A reativação de
  matrícula cancelada ocupa vaga. A ocupação exibida conta apenas as matrículas ativas.
- **Média**: é sempre de 0 a 10. Cada nota é convertida pela nota máxima do item (até 1000 pontos) e ponderada pelo
  peso; itens sem nota não entram. A situação "Aprovado" (média a partir de 6,0) é apenas referência visual.
- **Itens do Rooster Learn**: aparecem em Notas como somente leitura. Título, peso e nota máxima são alterados na
  atividade; a nota vem da correção; o reenvio do aluno retira a nota até a nova correção; excluir a atividade
  exclui o item.
- **Chamada**: não aceita data futura nem aluno sem matrícula ativa. Corrigir uma chamada já lançada exige a
  permissão "Editar chamada anterior" (os professores a recebem por padrão; retire-a em Acessos para que apenas a
  coordenação possa corrigir). Atraso e falta justificada contam como presença.

Um cadastro em uso não pode ser excluído: curso com disciplinas ou alunos, disciplina com turmas e período letivo
com turmas. Para tirá-lo de uso, altere o status (curso inativo, disciplina arquivada).

Os vínculos entre esses cadastros são flexíveis:

- **Disciplina sem curso**: o campo "Curso" da disciplina é opcional. A disciplina pode ser cadastrada no catálogo
  sem curso e sem turma, e vinculada a um curso depois, pela edição. O filtro "Sem curso" da aba Disciplinas lista as
  que ainda não têm curso.
- **Turma sem disciplina**: para criar uma turma basta a identificação e o período letivo; disciplina e professor são
  opcionais. A disciplina é atribuída depois, em Turmas → abrir a turma → Editar → Disciplina. Enquanto a turma não
  tiver disciplina, ela aparece como "Sem disciplina" e não permite anexar documentos acadêmicos (que pertencem à
  disciplina).

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
