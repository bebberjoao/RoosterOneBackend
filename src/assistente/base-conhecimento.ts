// ARQUIVO GERADO por scripts/assistente/gerar-base.js a partir de docs/manual-usuario/manual.json e
// docs/user-guides/*.md. Não editar manualmente: alterar o manual ou os guias e executar `npm run assistente:base`.

export interface EntradaBase {
  id: string;
  /** Parte da documentação de origem. */
  origem: 'manual-tela' | 'manual-modulo' | 'manual-visao-geral' | 'faq' | 'glossario' | 'instalacao' | 'guia';
  modulo: string;
  titulo: string;
  /** Tela do sistema relacionada, quando navegável (sem parâmetros). */
  rota: string | null;
  quemUsa?: string;
  resumo: string;
  passos: string[];
  observacoes: string[];
  efeitos?: string;
}

export const BASE_CONHECIMENTO: EntradaBase[] = [
  {
    "passos": [
      "Informar o e-mail cadastrado no campo correspondente.",
      "Informar a senha.",
      "Selecionar \"Entrar\".",
      "Com os dados corretos, o sistema exibe a página inicial, com o menu dos módulos a que o usuário tem acesso."
    ],
    "observacoes": [],
    "id": "tela-inicial-de-login",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Acesso ao sistema (login)",
    "rota": null,
    "quemUsa": "Todos os usuários cadastrados.",
    "resumo": "Primeira tela exibida ao acessar o endereço do sistema. O acesso é realizado com o e-mail e a senha cadastrados para o usuário.",
    "efeitos": "O cadastro (e-mail, senha e módulos acessíveis) é realizado pelo administrador do sistema, no Rooster Hub. O usuário sem conta deve solicitar o cadastro ao administrador. A sessão é renovada automaticamente durante o uso, sem necessidade de novo login a cada período. Abaixo do formulário, o link \"acessar o Rooster Boost\" conduz ao portal de cursos livres (capítulo 9)."
  },
  {
    "passos": [
      "Na tela de login, selecionar \"Esqueci minha senha\".",
      "Informar o e-mail da conta e confirmar.",
      "O sistema exibe mensagem informando que, se o e-mail estiver cadastrado, um link foi enviado. Por segurança, a mensagem é a mesma em qualquer caso, inclusive quando o e-mail informado não existe.",
      "Acessar o link recebido por e-mail (válido por 1 hora e de uso único)."
    ],
    "observacoes": [],
    "id": "link-esqueci-minha-senha-na-tela-de-login",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Recuperação de senha",
    "rota": null,
    "quemUsa": "Usuários que não se recordam da senha.",
    "resumo": "Procedimento seguro de definição de nova senha, sem intervenção do administrador.",
    "efeitos": "O link de redefinição é gerado e controlado pelo sistema, com validade curta por segurança; expirado o prazo, o procedimento deve ser repetido."
  },
  {
    "passos": [
      "Informar a nova senha (mínimo de 8 caracteres) e repeti-la no campo de confirmação.",
      "Confirmar; o sistema informa o resultado e conduz à tela de login.",
      "Realizar o login com a nova senha."
    ],
    "observacoes": [],
    "id": "redefinir-senha-link-recebido-por-e-mail",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Definição da nova senha",
    "rota": "/redefinir-senha",
    "quemUsa": "Usuários que solicitaram a recuperação de senha.",
    "resumo": "Tela aberta pelo link recebido por e-mail, para a definição da nova senha.",
    "efeitos": "O link já utilizado ou expirado é recusado, com a orientação de repetir a solicitação. A troca de senha encerra as sessões abertas em outros dispositivos."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "raiz",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Página inicial",
    "rota": "/",
    "quemUsa": "Todos os usuários.",
    "resumo": "Tela exibida após o login, com atalhos para os módulos autorizados ao usuário e os avisos recentes.",
    "efeitos": "Os atalhos exibidos dependem das permissões do usuário; os avisos provêm da central de notificações."
  },
  {
    "passos": [],
    "observacoes": [
      "A seleção do nome de um módulo exibe as respectivas telas.",
      "O módulo em uso permanece destacado.",
      "O botão no canto superior esquerdo recolhe e expande o menu; em telas menores (celular ou tablet), o menu é aberto por esse mesmo botão."
    ],
    "id": "barra-lateral-presente-em-todas-as-telas",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Menu lateral",
    "rota": null,
    "quemUsa": "Todos os usuários; o conteúdo varia conforme as permissões de cada um.",
    "resumo": "Meio de navegação entre os módulos e as telas do sistema. São exibidos apenas os módulos e as telas autorizados ao usuário; a ausência de um módulo indica falta de permissão, a ser solicitada ao administrador no Rooster Hub.",
    "efeitos": "O conteúdo do menu é determinado pelas permissões concedidas ao usuário no Rooster Hub e não é configurável pelo próprio usuário."
  },
  {
    "passos": [
      "Selecionar o ícone de sino na barra superior para visualizar os avisos recentes; o número sobre o ícone indica os avisos não lidos.",
      "Selecionar um aviso para acessar diretamente a tela do assunto (por exemplo, o aviso de chamado respondido abre o respectivo chamado).",
      "Utilizar a opção de marcação como lido, individualmente ou para todos os avisos."
    ],
    "observacoes": [],
    "id": "notifications-icone-de-sino-na-barra-superior",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Notificações",
    "rota": "/notifications",
    "quemUsa": "Todos os usuários.",
    "resumo": "Central de avisos sobre eventos relacionados ao usuário: resposta em chamado, atribuição de chamado, nota lançada, atividade publicada ou corrigida, decisão sobre reserva, cobrança, entre outros.",
    "efeitos": "Cada aviso é gerado por outro módulo e reunido nesta central, o que dispensa a consulta a cada módulo. A lista é atualizada periodicamente."
  },
  {
    "passos": [
      "Selecionar o botão do assistente, no canto inferior direito de qualquer tela, e escrever a dúvida no campo \"Sua dúvida\"; a tecla Enter envia a pergunta.",
      "Consultar a resposta, que apresenta o módulo, a tela, os usuários, o resumo e o procedimento; a opção \"Mais detalhes\" exibe as observações da tela.",
      "Selecionar \"Abrir a tela\" para acessar diretamente a tela indicada, ou um dos \"Assuntos relacionados\" para consultar tema próximo.",
      "Nas tarefas principais, selecionar \"Mostrar na tela\" para iniciar o roteiro guiado: a tela é escurecida e somente o campo do passo permanece em destaque, acompanhado de legenda que informa o que fazer e a finalidade do campo.",
      "Executar a ação indicada em cada passo: nos passos de clique, o roteiro avança automaticamente; nos de preenchimento ou de consulta, avança pelo botão \"Próximo\". O botão \"Anterior\" retorna ao passo anterior, quando possível, e a tecla Esc ou o botão de fechar encerram o roteiro a qualquer momento."
    ],
    "observacoes": [
      "Tarefas com roteiro guiado: abrir chamado; acompanhar e responder chamado; reservar sala ou ambiente; aprovar ou cancelar reservas; cadastrar usuário; conceder permissões; registrar frequência; lançar notas; criar e publicar atividade; cadastrar questões; corrigir entregas; responder atividade (aluno); gerar mensalidades; registrar pagamento; cadastrar item de patrimônio.",
      "O roteiro guiado é oferecido somente para as tarefas que o usuário tem permissão para executar; nas demais, a resposta orienta a solicitar a permissão ao administrador.",
      "Durante o roteiro, apenas o elemento destacado responde ao clique. Quando o elemento não está visível (por exemplo, lista sem itens), a legenda informa o motivo, e o roteiro prossegue assim que o elemento aparece.",
      "Dúvidas fora do escopo do sistema não são respondidas; para problemas no funcionamento do sistema, deve ser aberto um chamado no Rooster Desk."
    ],
    "id": "botao-do-assistente-no-canto-inferior-direito",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Assistente de dúvidas",
    "rota": null,
    "quemUsa": "Todos os usuários.",
    "resumo": "Assistente que esclarece dúvidas sobre a utilização do sistema com base neste manual. A dúvida é escrita em linguagem comum (por exemplo, \"como abro um chamado?\"), e a resposta indica o módulo e a tela correspondentes, o procedimento e, nas tarefas principais, a opção de acompanhamento guiado na própria tela (roteiro guiado). O assistente trata exclusivamente da utilização do sistema: não consulta informações registradas, como notas, cobranças ou chamados, nem executa operações.",
    "efeitos": "As respostas são extraídas deste manual e dos guias do sistema. Toda operação realizada durante o roteiro guiado é executada pelo próprio usuário, com as mesmas permissões e validações de sempre; encerrar o roteiro não desfaz nem altera informações."
  },
  {
    "passos": [
      "Selecionar o ícone de saída, no canto direito da barra superior.",
      "No acesso seguinte, será necessário informar novamente o e-mail e a senha."
    ],
    "observacoes": [],
    "id": "icone-de-saida-na-barra-superior",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Encerramento da sessão",
    "rota": null,
    "quemUsa": "Todos os usuários.",
    "resumo": "Encerra a sessão no dispositivo em uso, procedimento recomendado em computadores compartilhados.",
    "efeitos": "Não há, na versão atual, troca da própria senha com a sessão ativa; utiliza-se o procedimento de recuperação de senha, disponível a qualquer momento, inclusive quando a senha atual é conhecida."
  },
  {
    "passos": [
      "Utilizar o interruptor \"Tema escuro\" para alternar a aparência; a preferência é armazenada no dispositivo e no navegador em uso."
    ],
    "observacoes": [
      "Seção \"E-mail\" (administradores): exibe se o envio de e-mail, utilizado, por exemplo, na recuperação de senha, está configurado, o servidor e o remetente em uso, e oferece o botão \"Enviar e-mail de teste\" para a verificação do envio."
    ],
    "id": "settings",
    "origem": "manual-tela",
    "modulo": "Geral",
    "titulo": "Configurações",
    "rota": "/settings",
    "quemUsa": "Todos os usuários (tema); a seção \"E-mail\" é exibida apenas aos administradores.",
    "resumo": "Preferências gerais. A preferência efetivamente funcional é o tema (claro ou escuro); os demais cartões da tela (identidade da instituição, módulos contratados e segurança) são informativos.",
    "efeitos": "O estado do e-mail reflete a configuração realizada pela equipe técnica no servidor; esta tela não altera a configuração, apenas a exibe e permite testá-la."
  },
  {
    "passos": [
      "Cadastrar o usuário em \"Usuários\".",
      "Vincular o usuário ao setor correspondente em \"Setores\".",
      "Conceder as permissões necessárias em \"Acessos e permissões\".",
      "Quando aplicável, vincular o usuário como professor ou aluno no Rooster Academy (capítulo 6).",
      "Acompanhar as ações realizadas pelo relatório de auditoria."
    ],
    "observacoes": [
      "Usuário: pessoa com login no sistema (e-mail e senha). Professores e alunos do Academy são usuários do Hub com vínculo acadêmico.",
      "Setor: agrupamento de usuários por área de atuação, utilizado para direcionar chamados.",
      "Permissão: autorização para uma ação específica em uma tela de um módulo (por exemplo, acessar, criar, aprovar ou excluir). As permissões são concedidas diretamente a cada usuário, sem perfis fixos.",
      "Administrador: usuário com a permissão \"Gerenciar permissões\". O sistema impede que a instituição fique sem administrador.",
      "Auditoria: registro automático das ações relevantes (login, alterações de cadastro, decisões e operações financeiras), com autor e data."
    ],
    "id": "modulo-rooster-hub",
    "origem": "manual-modulo",
    "modulo": "Rooster Hub",
    "titulo": "Rooster Hub — Usuários e permissões: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Hub é o módulo de controle de acesso: define quem pode utilizar o sistema e o que cada usuário pode realizar. É utilizado, em regra, apenas pelos administradores; professores, alunos e atendentes normalmente não o visualizam no menu. Sempre que uma tela de outro módulo exige permissão não concedida ao usuário, a concessão deve ser realizada neste módulo."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "hub",
    "origem": "manual-tela",
    "modulo": "Rooster Hub",
    "titulo": "Painel",
    "rota": "/hub",
    "quemUsa": "Administradores.",
    "resumo": "Visão geral do módulo: quantidades de usuários, permissões concedidas, setores e sessões ativas, atalhos para as telas do módulo e atividade recente.",
    "efeitos": "Os números consolidam os cadastros das demais telas do módulo, e a atividade recente provém do registro de auditoria."
  },
  {
    "passos": [
      "Criação: selecionar \"Novo\", informar nome, e-mail e senha inicial (mínimo de 8 caracteres) e salvar.",
      "Edição: selecionar o ícone de edição na linha do usuário, alterar os dados necessários e salvar.",
      "Redefinição de senha: utilizar a opção de redefinição na linha do usuário; as sessões abertas do usuário são encerradas, e a nova senha deve ser comunicada por canal separado.",
      "Desativação: recomenda-se desativar o usuário, em vez de excluí-lo; o usuário deixa de acessar o sistema, e seu histórico (chamados, notas, reservas etc.) é preservado."
    ],
    "observacoes": [],
    "id": "hub-usuarios",
    "origem": "manual-tela",
    "modulo": "Rooster Hub",
    "titulo": "Usuários",
    "rota": "/hub/usuarios",
    "quemUsa": "Administradores.",
    "resumo": "Cadastro das pessoas autorizadas a utilizar o sistema.",
    "efeitos": "O usuário recém-criado não possui permissões; os setores e as permissões necessários devem ser concedidos nas telas correspondentes. O sistema não permite excluir, desativar nem retirar a permissão de administrador do último administrador ativo."
  },
  {
    "passos": [
      "Criação: selecionar \"Novo\", informar nome e descrição e salvar.",
      "Vínculo de pessoas: utilizar a opção de gerenciamento de usuários do setor para incluir ou remover integrantes."
    ],
    "observacoes": [],
    "id": "hub-setores",
    "origem": "manual-tela",
    "modulo": "Rooster Hub",
    "titulo": "Setores",
    "rota": "/hub/setores",
    "quemUsa": "Administradores.",
    "resumo": "Os setores agrupam pessoas por área (por exemplo, Secretaria Acadêmica, Suporte de TI e Coordenação) e determinam, entre outros aspectos, a equipe responsável por cada chamado de suporte.",
    "efeitos": "O setor do usuário é utilizado pelo Rooster Desk para determinar os chamados que lhe são exibidos para atendimento."
  },
  {
    "passos": [
      "Selecionar o usuário na coluna \"1. Usuário\" (a busca localiza pelo nome ou pelo e-mail).",
      "Na coluna \"2. Permissões\", marcar ou desmarcar as ações de cada tela de cada módulo (por exemplo, \"Rooster Desk → Chamados → Encerrar\").",
      "Selecionar \"Salvar permissões\"; a alteração vale a partir do próximo acesso do usuário à tela correspondente."
    ],
    "observacoes": [
      "Relatório de auditoria: histórico das ações relevantes realizadas no sistema, com o autor, a ação e a data, exportável em CSV.",
      "Relatório de erros: falhas técnicas registradas automaticamente pelo servidor, destinadas à investigação pelo suporte técnico, exportável em CSV."
    ],
    "id": "hub-acessos",
    "origem": "manual-tela",
    "modulo": "Rooster Hub",
    "titulo": "Acessos e permissões",
    "rota": "/hub/acessos",
    "quemUsa": "Administradores.",
    "resumo": "Tela de definição, para cada usuário, do que pode ser visualizado e realizado em cada módulo, e de consulta aos registros de auditoria e de erros.",
    "efeitos": "Cada permissão concedida libera ou oculta um botão, uma tela ou um menu inteiro em qualquer módulo, constituindo o elemento central do controle de acesso do Rooster One. A permissão \"Gerenciar permissões\" confere a condição de administrador e deve ser concedida com cautela."
  },
  {
    "passos": [
      "O solicitante abre o chamado, escolhendo a categoria e a subcategoria.",
      "O chamado é exibido à equipe do setor responsável, que o assume.",
      "A equipe e o solicitante trocam mensagens até a solução; cada resposta gera notificação.",
      "A equipe encerra o chamado, que pode ser reaberto se o problema persistir."
    ],
    "observacoes": [
      "Chamado: solicitação registrada por um usuário, identificada por código (por exemplo, TCK-0001).",
      "Categoria e subcategoria: classificação do chamado, que define o setor responsável e o prazo de atendimento.",
      "SLA: prazo esperado de atendimento, em horas, definido pela categoria ou pela subcategoria.",
      "Status: situação do chamado: aberto, em atendimento, pendente, resolvido ou encerrado.",
      "Prioridade: baixa, média, alta ou crítica, definida pela equipe de atendimento.",
      "Nota interna: mensagem visível apenas à equipe de atendimento."
    ],
    "id": "modulo-rooster-desk",
    "origem": "manual-modulo",
    "modulo": "Rooster Desk",
    "titulo": "Rooster Desk — Chamados de suporte: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Desk é o canal oficial de solicitação de suporte na instituição, para questões de acesso, sistemas ou infraestrutura (rede, salas e equipamentos). É também o canal de suporte ao próprio Rooster One. O módulo possui duas perspectivas: a do solicitante, que abre o chamado e acompanha o atendimento, e a da equipe de atendimento, que responde, transfere e encerra."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "desk",
    "origem": "manual-tela",
    "modulo": "Rooster Desk",
    "titulo": "Painel",
    "rota": "/desk",
    "quemUsa": "Usuários com acesso ao módulo.",
    "resumo": "Resumo dos chamados por status (abertos, em atendimento, pendentes e resolvidos), últimos chamados, chamados críticos e, para usuários autorizados, o relatório de cumprimento do prazo de atendimento (SLA)."
  },
  {
    "passos": [
      "Abertura: selecionar \"Novo chamado\", escolher a categoria e a subcategoria (que definem automaticamente o setor responsável e o prazo esperado de resposta), informar o título, descrever a solicitação e, se necessário, anexar arquivo (captura de tela, documento ou foto, com até 10 MB).",
      "Acompanhamento: selecionar o chamado na lista para abrir o detalhe (seção seguinte)."
    ],
    "observacoes": [],
    "id": "desk-tickets",
    "origem": "manual-tela",
    "modulo": "Rooster Desk",
    "titulo": "Chamados",
    "rota": "/desk/tickets",
    "quemUsa": "Solicitantes e equipe de atendimento.",
    "resumo": "Relação dos chamados abertos pelo usuário (solicitante) ou sob responsabilidade do seu setor (atendente), com filtros por status, categoria e prioridade.",
    "efeitos": "A categoria escolhida na abertura determina o setor de destino e o prazo esperado de resposta, definidos pela coordenação do suporte."
  },
  {
    "passos": [
      "Consultar o status, a prioridade, a categoria, o técnico responsável e o prazo de atendimento.",
      "Trocar mensagens com o atendimento, com anexos; as mensagens são atualizadas em tempo real, e cada resposta gera notificação."
    ],
    "observacoes": [
      "Equipe de atendimento: assumir o chamado, alterar status e prioridade, registrar nota interna (visível apenas à equipe, e não ao solicitante), transferir a outro atendente (o atendente designado é notificado), encerrar e, se necessário, reabrir."
    ],
    "id": "desk-tickets-id",
    "origem": "manual-tela",
    "modulo": "Rooster Desk",
    "titulo": "Detalhe do chamado",
    "rota": null,
    "quemUsa": "Solicitante do chamado e equipe de atendimento.",
    "resumo": "Conversa e situação de um chamado.",
    "efeitos": "As alterações de status, prioridade, categoria e técnico são registradas no histórico do chamado, exibido na mesma tela."
  },
  {
    "passos": [
      "Selecionar \"Nova categoria\", informar o nome, o setor responsável e o prazo de atendimento esperado (SLA) e salvar.",
      "Abrir a categoria para cadastrar as subcategorias (seção seguinte)."
    ],
    "observacoes": [],
    "id": "desk-categories",
    "origem": "manual-tela",
    "modulo": "Rooster Desk",
    "titulo": "Categorias",
    "rota": "/desk/categories",
    "quemUsa": "Coordenação do suporte.",
    "resumo": "Cadastro dos tipos de chamado (por exemplo, \"Acesso e Contas\", \"Sistemas Acadêmicos\" e \"Infraestrutura\").",
    "efeitos": "Esta tela determina o direcionamento dos chamados na abertura; as alterações afetam o comportamento de abertura para todos os usuários."
  },
  {
    "passos": [
      "Incluir, editar ou desativar as subcategorias.",
      "Definir o SLA de cada subcategoria, quando diferente do padrão da categoria."
    ],
    "observacoes": [],
    "id": "desk-categories-id",
    "origem": "manual-tela",
    "modulo": "Rooster Desk",
    "titulo": "Subcategorias de uma categoria",
    "rota": null,
    "quemUsa": "Coordenação do suporte.",
    "resumo": "Detalhamento de uma categoria em subcategorias (por exemplo, \"Redefinição de senha\" em \"Acesso e Contas\"), cada uma com prazo de atendimento próprio."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "desk-team",
    "origem": "manual-tela",
    "modulo": "Rooster Desk",
    "titulo": "Atendentes",
    "rota": "/desk/team",
    "quemUsa": "Coordenação do suporte.",
    "resumo": "Vincula atendentes às subcategorias de chamado, definindo os responsáveis por cada tipo de solicitação, e exibe as permissões de atendimento de cada um.",
    "efeitos": "Os chamados de cada tipo são exibidos na fila de atendimento dos integrantes do setor responsável e dos atendentes vinculados."
  },
  {
    "passos": [
      "A equipe de gestão cadastra a estrutura física (campus, blocos e ambientes).",
      "O usuário solicita a reserva em \"Reservar\".",
      "A equipe analisa o pedido em \"Gerenciar reservas\" e aprova, responde ou cancela, com motivo.",
      "O solicitante é notificado e acompanha o pedido em \"Minhas reservas\"."
    ],
    "observacoes": [
      "Ambiente: espaço reservável, pertencente a um bloco de um campus, com tipo, capacidade e horário de funcionamento.",
      "Reserva: pedido de uso de um ambiente em data e horário determinados, identificado por código.",
      "Situação da reserva: em análise (aguarda decisão), confirmada (aprovada), em andamento, finalizada ou cancelada.",
      "Reserva recorrente: série de reservas repetidas (diária, semanal ou mensal), criada de uma só vez; exige permissão própria.",
      "Antecedência: prazo máximo, a partir da data atual, para a solicitação: 15 dias, ou até 1 ano com permissão de prazo estendido."
    ],
    "id": "modulo-rooster-rooms",
    "origem": "manual-modulo",
    "modulo": "Rooster Rooms",
    "titulo": "Rooster Rooms — Reserva de ambientes: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Rooms destina-se à reserva dos espaços físicos da instituição: auditórios, salas de aula, laboratórios e salas de reunião. Toda reserva é solicitada pelo usuário e analisada pela equipe de gestão dos ambientes."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "rooms",
    "origem": "manual-tela",
    "modulo": "Rooster Rooms",
    "titulo": "Painel",
    "rota": "/rooms",
    "quemUsa": "Usuários com acesso ao módulo.",
    "resumo": "Resumo da ocupação: próximas reservas, agenda do dia, reservas em análise e ambientes indisponíveis."
  },
  {
    "passos": [
      "Selecionar o ambiente na lista (a busca localiza pelo nome ou pelo código) e consultar, no calendário, os horários ocupados do dia.",
      "Informar data, horário de início e de término, quantidade de participantes e finalidade (aula, reunião, evento etc.). Em reserva de aula, o professor pode vincular a turma correspondente.",
      "Para reserva recorrente (por exemplo, a mesma aula semanal), utilizar o campo \"Repetição\" e definir a data final, se o usuário possuir essa permissão.",
      "Selecionar \"Enviar solicitação\"; o pedido é encaminhado à equipe de gestão do ambiente."
    ],
    "observacoes": [],
    "id": "rooms-book",
    "origem": "manual-tela",
    "modulo": "Rooster Rooms",
    "titulo": "Reservar",
    "rota": "/rooms/book",
    "quemUsa": "Usuários autorizados a solicitar reservas.",
    "resumo": "Solicitação de uso de ambiente em data e horário determinados.",
    "efeitos": "A antecedência máxima é de 15 dias, salvo permissão de prazo estendido. O sistema recusa solicitações acima da capacidade do ambiente, fora do horário de funcionamento ou em conflito com outra reserva."
  },
  {
    "passos": [],
    "observacoes": [
      "Consulta da situação (em análise, confirmada, em andamento, finalizada ou cancelada).",
      "Abertura da reserva para trocar mensagens com a equipe responsável e solicitar alterações (seção seguinte).",
      "Cancelamento de reserva própria, com indicação do motivo."
    ],
    "id": "rooms-reservations",
    "origem": "manual-tela",
    "modulo": "Rooster Rooms",
    "titulo": "Minhas reservas",
    "rota": "/rooms/reservations",
    "quemUsa": "Solicitantes.",
    "resumo": "Acompanhamento das reservas solicitadas pelo usuário, com contagem por situação.",
    "efeitos": "A situação é alterada pela equipe de gestão do ambiente, e o solicitante é notificado a cada decisão."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "rooms-reservations-id",
    "origem": "manual-tela",
    "modulo": "Rooster Rooms",
    "titulo": "Detalhe da reserva",
    "rota": null,
    "quemUsa": "Solicitante e equipe de gestão dos ambientes.",
    "resumo": "Dados completos da reserva (ambiente, data, horário, finalidade e turma vinculada), conversa com a equipe e histórico de alterações."
  },
  {
    "passos": [
      "Localizar o pedido, com filtros por situação, busca e data (dia específico ou período).",
      "Selecionar \"Aprovar\" para confirmar a reserva em análise.",
      "Selecionar \"Responder\" para enviar mensagem ao solicitante antes da decisão.",
      "Selecionar \"Cancelar\" para recusar ou cancelar a reserva, informando o motivo, exibido ao solicitante."
    ],
    "observacoes": [],
    "id": "rooms-manage",
    "origem": "manual-tela",
    "modulo": "Rooster Rooms",
    "titulo": "Gerenciar reservas",
    "rota": "/rooms/manage",
    "quemUsa": "Equipe de gestão dos ambientes.",
    "resumo": "Análise das solicitações de reserva.",
    "efeitos": "A reserva aprovada bloqueia o horário do ambiente, impedindo nova reserva do mesmo espaço no mesmo período."
  },
  {
    "passos": [
      "Cadastrar o campus; abrir o campus para cadastrar os blocos e, em cada bloco, os ambientes.",
      "Informar, para cada ambiente, o tipo (sala, laboratório, auditório etc.), a capacidade, os dias e o horário de funcionamento.",
      "Alterar a situação para \"manutenção\" ou \"bloqueado\" para impedir novas reservas temporariamente."
    ],
    "observacoes": [],
    "id": "rooms-structure",
    "origem": "manual-tela",
    "modulo": "Rooster Rooms",
    "titulo": "Estrutura física",
    "rota": "/rooms/structure",
    "quemUsa": "Equipe de gestão dos ambientes.",
    "resumo": "Cadastro de campi, blocos e ambientes disponíveis para reserva, com tipo, capacidade, dias e horários de funcionamento e situação.",
    "efeitos": "A tela \"Reservar\" utiliza este cadastro para oferecer os ambientes e validar capacidade e funcionamento."
  },
  {
    "passos": [
      "Cadastrar as categorias e os setores de patrimônio.",
      "Cadastrar os itens.",
      "Registrar cada movimentação, empréstimo e devolução.",
      "Acompanhar, no painel, os empréstimos em atraso e o valor do patrimônio."
    ],
    "observacoes": [
      "Item de patrimônio: bem identificado por código, com categoria, valor, setor, localização e estado de conservação.",
      "Situação: disponível, em uso, emprestado, em manutenção ou baixado (retirado do patrimônio).",
      "Movimentação: registro de mudança de setor ou de sala, empréstimo, devolução ou envio para manutenção.",
      "Empréstimo: retirada temporária do item por um responsável, com prazo de devolução; vencido o prazo, o empréstimo passa a constar como atrasado."
    ],
    "id": "modulo-rooster-assets",
    "origem": "manual-modulo",
    "modulo": "Rooster Assets",
    "titulo": "Rooster Assets — Controle de patrimônio: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Assets controla os bens da instituição: computadores, projetores, mobiliário e demais equipamentos, com localização, responsável, estado de conservação e histórico de movimentações."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "assets",
    "origem": "manual-tela",
    "modulo": "Rooster Assets",
    "titulo": "Painel",
    "rota": "/assets",
    "quemUsa": "Equipe responsável pelo patrimônio.",
    "resumo": "Resumo dos itens por situação (disponíveis, emprestados, em manutenção, inativos e empréstimos em atraso), últimos itens cadastrados, movimentações recentes e valor do patrimônio por categoria, com a opção de registrar a devolução de empréstimo."
  },
  {
    "passos": [
      "Selecionar a categoria para listar os itens.",
      "Cadastro: selecionar \"Novo item\", informar nome, categoria, marca e modelo, número de série, valor de aquisição, setor, localização e estado de conservação, e salvar.",
      "Movimentação (mudança de setor ou de sala, ou envio para manutenção): abrir o item e utilizar \"Registrar movimentação\".",
      "Empréstimo: registrar o responsável pela retirada e o prazo de devolução; na devolução, registrá-la."
    ],
    "observacoes": [],
    "id": "assets-inventory",
    "origem": "manual-tela",
    "modulo": "Rooster Assets",
    "titulo": "Patrimônio",
    "rota": "/assets/inventory",
    "quemUsa": "Equipe responsável pelo patrimônio.",
    "resumo": "Cadastro e acompanhamento de cada item, organizado por categoria (por exemplo, Informática, Mobiliário e Audiovisual).",
    "efeitos": "Cada item mantém o histórico completo de movimentações (localizações, responsáveis e manutenções). O item baixado não pode ser movimentado. Os empréstimos com prazo vencido passam a constar automaticamente do painel."
  },
  {
    "passos": [
      "A coordenação cadastra cursos, disciplinas e o período letivo.",
      "A coordenação vincula professores e alunos (usuários do Hub) e cria as turmas.",
      "A coordenação matricula os alunos nas turmas.",
      "O professor registra a frequência e lança as notas; as atividades do Learn complementam as notas.",
      "O aluno acompanha tudo pelo Rooster Student."
    ],
    "observacoes": [
      "Curso: programa de formação (por exemplo, Engenharia de Software), ao qual o aluno está vinculado.",
      "Disciplina: componente curricular do curso, com carga horária.",
      "Período letivo: semestre ou ano letivo (por exemplo, 2026.2), com datas de início e de término.",
      "Turma: oferta de uma disciplina em um período, com professor, horário e vagas.",
      "Matrícula: inclusão do aluno em uma turma.",
      "Item avaliativo: avaliação da turma (prova, trabalho ou atividade do Learn), com peso e nota máxima.",
      "Média: média ponderada dos itens com nota lançada."
    ],
    "id": "modulo-rooster-academy",
    "origem": "manual-modulo",
    "modulo": "Rooster Academy",
    "titulo": "Rooster Academy — Gestão acadêmica: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Academy organiza a vida acadêmica: cursos, disciplinas, turmas, matrículas, frequência e notas. É utilizado pela coordenação, que organiza a estrutura, e pelos professores, que registram frequência e avaliações. As informações do aluno estão reunidas no Rooster Student (capítulo 8)."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "academy",
    "origem": "manual-tela",
    "modulo": "Rooster Academy",
    "titulo": "Painel",
    "rota": "/academy",
    "quemUsa": "Coordenação e professores.",
    "resumo": "Para a coordenação, resumo institucional (disciplinas, turmas, professores, alunos, frequência e documentos) com gráficos por turno e por curso; para o professor, painel restrito às turmas que leciona. O botão \"Calendário acadêmico\" abre as datas do período."
  },
  {
    "passos": [],
    "observacoes": [
      "Disciplinas: catálogo do que a instituição oferece, com curso, carga horária e documentos (planos de ensino e ementas).",
      "Turmas: oferta efetiva de uma disciplina em um período letivo, com professor, turno, sala, horário e quantidade de vagas.",
      "Professores e Alunos: vínculo de pessoa já cadastrada no Rooster Hub à função de professor ou de aluno (com registro acadêmico e curso); não se cria novo login.",
      "Matrícula: inclusão de aluno em turma, respeitado o número de vagas.",
      "Calendário: datas relevantes do período (início do semestre, provas, feriados e eventos), exibidas a professores e alunos."
    ],
    "id": "academy-manage",
    "origem": "manual-tela",
    "modulo": "Rooster Academy",
    "titulo": "Gestão acadêmica",
    "rota": "/academy/manage",
    "quemUsa": "Coordenação acadêmica.",
    "resumo": "Organização da estrutura do período letivo, em abas: Disciplinas, Turmas, Professores, Alunos e Calendário.",
    "efeitos": "A turma depende do cadastro prévio da disciplina, do período letivo e do professor. O aluno somente aparece nas telas de frequência e de notas de uma turma após a matrícula."
  },
  {
    "passos": [
      "Selecionar a turma; são exibidos os alunos e as chamadas anteriores.",
      "Informar a data da aula e registrar presença, falta, atraso ou falta justificada para cada aluno matriculado.",
      "Salvar; o registro fica disponível ao aluno no Rooster Student."
    ],
    "observacoes": [],
    "id": "academy-attendance",
    "origem": "manual-tela",
    "modulo": "Rooster Academy",
    "titulo": "Frequência",
    "rota": "/academy/attendance",
    "quemUsa": "Professores (nas próprias turmas) e coordenação.",
    "resumo": "Registro da presença dos alunos em cada aula.",
    "efeitos": "O professor registra a frequência apenas das turmas que leciona, ainda que possua a permissão; a coordenação pode registrar em qualquer turma. A frequência abaixo de 75% é destacada ao aluno como risco de reprovação, sem reprovação automática."
  },
  {
    "passos": [
      "Selecionar a turma.",
      "Configurar os itens avaliativos da turma (por exemplo, \"Prova 1\", com peso 0,6) e a nota máxima de cada um.",
      "Lançar a nota de cada aluno em cada item; o aluno é notificado do lançamento.",
      "A média é calculada automaticamente, ponderada pelos pesos dos itens com nota lançada (itens sem nota não são considerados)."
    ],
    "observacoes": [],
    "id": "academy-grades",
    "origem": "manual-tela",
    "modulo": "Rooster Academy",
    "titulo": "Notas",
    "rota": "/academy/grades",
    "quemUsa": "Professores (nas próprias turmas) e coordenação.",
    "resumo": "Lançamento das notas dos alunos, com o peso de cada avaliação na média final.",
    "efeitos": "A atividade do Rooster Learn publicada com peso aparece nesta tela como item avaliativo, e a nota atribuída na correção da atividade (capítulo 7) integra automaticamente a média, sem novo lançamento."
  },
  {
    "passos": [
      "O professor cria a atividade na turma e cadastra as questões.",
      "O professor publica a atividade; os alunos são notificados.",
      "O aluno responde e envia; as questões objetivas são pontuadas automaticamente.",
      "O professor pontua as questões discursivas e de envio de arquivo e salva a correção.",
      "A nota é propagada ao Academy, e o aluno consulta a nota, o feedback e o gabarito."
    ],
    "observacoes": [
      "Atividade: tarefa da turma (prova, lista, trabalho, questionário ou material), com prazo, peso e nota máxima.",
      "Situação da atividade: rascunho (visível apenas ao professor), publicada, encerrada ou arquivada.",
      "Questão: item da atividade, de um dos tipos: múltipla escolha com uma resposta, múltipla escolha com várias respostas, verdadeiro ou falso, discursiva ou envio de arquivo.",
      "Gabarito: alternativas corretas das questões objetivas; oculto ao aluno até a correção da própria entrega.",
      "Entrega: resposta do aluno à atividade; situação: enviada, atrasada, reenvio ou corrigida.",
      "Correção automática: pontuação das questões objetivas no envio, com pontuação integral apenas quando todas as alternativas corretas, e somente elas, são marcadas."
    ],
    "id": "modulo-rooster-learn",
    "origem": "manual-modulo",
    "modulo": "Rooster Learn",
    "titulo": "Rooster Learn — Atividades e entregas: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Learn permite aos professores criar atividades (provas, listas, trabalhos, questionários e materiais) para as turmas do Rooster Academy e aos alunos enviar as respectivas respostas. A atividade pode conter questões de múltipla escolha (com uma ou várias respostas corretas), de verdadeiro ou falso, discursivas e de envio de arquivo, cada uma com texto e imagem de apoio opcionais. As questões objetivas são corrigidas automaticamente no envio; as discursivas e as de envio de arquivo são pontuadas pelo professor. A atividade sem questões é respondida em texto livre, com anexos."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "learn",
    "origem": "manual-tela",
    "modulo": "Rooster Learn",
    "titulo": "Painel",
    "rota": "/learn",
    "quemUsa": "Professores, coordenação e alunos.",
    "resumo": "Para o professor e a coordenação, resumo das atividades publicadas, das entregas recebidas e das turmas, com a relação de atividades (prazo, situação e entregas) e as abas Turmas e Relatórios; para o aluno, resumo das próprias atividades."
  },
  {
    "passos": [
      "Selecionar a turma.",
      "Criar a atividade: título, tipo (prova, lista, trabalho, questionário ou material), descrição, prazo de entrega, peso, nota máxima e se admite entrega após o prazo.",
      "Abrir a atividade e, se desejado, cadastrar as questões na aba Questões (seção seguinte).",
      "Publicar a atividade quando concluída; a partir da publicação, ela é exibida aos alunos da turma, que são notificados."
    ],
    "observacoes": [
      "A atividade criada por engano pode ser excluída; as questões e as imagens de apoio são excluídas com ela."
    ],
    "id": "learn-classes",
    "origem": "manual-tela",
    "modulo": "Rooster Learn",
    "titulo": "Turmas e atividades",
    "rota": "/learn/classes",
    "quemUsa": "Professores (nas próprias turmas) e coordenação.",
    "resumo": "Seleção da turma e gestão das atividades.",
    "efeitos": "A publicação de atividade com peso maior que zero gera item avaliativo na tela de Notas do Academy (capítulo 6), e a nota da correção é incorporada automaticamente, sem novo lançamento. A atividade com peso zero não compõe a média."
  },
  {
    "passos": [
      "Na aba Questões, selecionar \"Adicionar questão\" e escolher o tipo: múltipla escolha (uma resposta), múltipla escolha (várias respostas), verdadeiro ou falso, discursiva ou envio de arquivo.",
      "Informar o enunciado, o texto de apoio (opcional), a imagem de apoio (opcional; JPEG, PNG, GIF ou WebP, até 5 MB), o valor em pontos e se a resposta é obrigatória.",
      "Nas questões objetivas, cadastrar as alternativas e marcar a correta (ou as corretas, na múltipla escolha com várias respostas). Salvar.",
      "Reordenar as questões pelas setas, editar pelo ícone de lápis, trocar ou remover a imagem de apoio e excluir pelo ícone de lixeira.",
      "Na aba Correção, selecionar a entrega: cada resposta é exibida com o gabarito; as questões objetivas já chegam pontuadas e podem ser revistas, e as discursivas e de envio de arquivo recebem a pontuação do professor. A nota calculada é exibida antes de salvar. Informar, se desejado, o feedback e selecionar \"Salvar correção\"."
    ],
    "observacoes": [
      "Após a primeira entrega, as questões não podem ser alteradas nem excluídas, para não invalidar as respostas enviadas; a reordenação permanece disponível.",
      "Quando todas as questões são objetivas, a entrega já chega corrigida, com nota calculada automaticamente; a correção pode ser revista na aba Correção.",
      "A nota é calculada como (pontos obtidos ÷ total de pontos) × nota máxima. Exemplo: 4,5 de 6 pontos, em atividade de nota máxima 10, resultam em nota 7,5.",
      "Na atividade sem questões, a aba Correção apresenta a resposta em texto e os anexos, e o professor informa diretamente a nota."
    ],
    "id": "learn-activities-id",
    "origem": "manual-tela",
    "modulo": "Rooster Learn",
    "titulo": "Detalhe da atividade: questões e correção",
    "rota": null,
    "quemUsa": "Professores (nas próprias turmas) e coordenação.",
    "resumo": "Detalhe da atividade, com as abas Descrição, Questões, Entregas, Correção, Notas, Feedback e Histórico.",
    "efeitos": "A nota calculada é propagada ao Academy (capítulo 6) da mesma forma que a nota lançada diretamente, e o aluno é notificado da correção."
  },
  {
    "passos": [
      "Selecionar a matéria; são exibidos os indicadores de desempenho e as abas \"A fazer\" e \"Realizadas\".",
      "Selecionar \"Responder\" na atividade desejada.",
      "Responder: na atividade com questões, marcar a alternativa (ou as alternativas) das questões objetivas, redigir as discursivas e anexar o arquivo das questões de envio de arquivo; na atividade sem questões, redigir a resposta e, se necessário, anexar arquivo. As questões obrigatórias sem resposta são destacadas e impedem o envio.",
      "Selecionar \"Enviar resposta\". Após o prazo, o envio é aceito como atrasado, se a atividade o permitir, ou recusado, em caso contrário. O reenvio substitui a resposta anterior e invalida eventual correção.",
      "Após a correção, a nota e o feedback do professor são exibidos na aba \"Realizadas\"; em \"Ver entrega\", cada questão é apresentada com a resposta dada, a pontuação obtida e o gabarito. Na atividade composta apenas por questões objetivas, a nota é exibida logo após o envio."
    ],
    "observacoes": [],
    "id": "learn-student",
    "origem": "manual-tela",
    "modulo": "Rooster Learn",
    "titulo": "Atividades do aluno",
    "rota": "/learn/student",
    "quemUsa": "Alunos.",
    "resumo": "Consulta das atividades das turmas do aluno, organizadas por matéria, e envio das respostas.",
    "efeitos": "A entrega é encaminhada à fila de correção do professor da turma; após a correção, a nota integra automaticamente a média do aluno, exibida também no Rooster Student. O gabarito somente é exibido depois da correção da própria entrega."
  },
  {
    "passos": [
      "O aluno acessa o sistema com o próprio login e é direcionado ao portal.",
      "Consulta disciplinas, frequência, notas e o calendário.",
      "Responde às atividades publicadas e acompanha a correção.",
      "Baixa documentos e boletos e acompanha a situação financeira."
    ],
    "observacoes": [],
    "id": "modulo-rooster-student",
    "origem": "manual-modulo",
    "modulo": "Rooster Student",
    "titulo": "Rooster Student — Portal do aluno: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Student reúne as informações da vida acadêmica do aluno, provenientes de diferentes módulos (Academy, Learn e Finance), sempre restritas aos dados do próprio aluno. As telas são acessadas pelo menu lateral ou pelas abas exibidas abaixo da identificação do aluno."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Painel",
    "rota": "/student",
    "quemUsa": "Alunos.",
    "resumo": "Resumo pessoal: disciplinas, média geral, frequência média, valores em aberto, alerta de frequência, próximas atividades e avisos importantes."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-profile",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Perfil acadêmico",
    "rota": "/student/profile",
    "quemUsa": "Alunos.",
    "resumo": "Dados cadastrais e vínculo acadêmico do aluno: curso, semestre, registro acadêmico, modalidade e situação. Os dados são mantidos pela secretaria; o cartão \"Contato\" é informativo, pois a atualização do contato pessoal pelo próprio aluno ainda não é registrada pelo sistema."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-disciplines",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Disciplinas",
    "rota": "/student/disciplines",
    "quemUsa": "Alunos.",
    "resumo": "Disciplinas e turmas em que o aluno está matriculado no período atual, com professor, horário, sala, frequência e média, e atalhos para as atividades e as notas de cada disciplina."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-activities",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Atividades",
    "rota": "/student/activities",
    "quemUsa": "Alunos.",
    "resumo": "Relação das atividades do Rooster Learn, com filtros por situação e disciplina, nota e feedback do professor.",
    "efeitos": "O formulário de resposta, inclusive das questões, e a revisão da entrega são os mesmos do capítulo 7 (Rooster Learn), apresentados no portal para evitar a troca de módulo."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-grades",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Notas e desempenho",
    "rota": "/student/grades",
    "quemUsa": "Alunos.",
    "resumo": "Notas de cada disciplina e média calculada, conforme lançadas pelo professor, inclusive as notas de atividades corrigidas no Rooster Learn."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-attendance",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Frequência",
    "rota": "/student/attendance",
    "quemUsa": "Alunos.",
    "resumo": "Presenças, faltas e percentual de frequência em cada disciplina, com destaque das disciplinas abaixo do mínimo de 75% e os registros recentes."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-history",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Histórico",
    "rota": "/student/history",
    "quemUsa": "Alunos.",
    "resumo": "Histórico acadêmico consolidado (disciplinas cursadas, médias e situação), coeficiente de rendimento e média por período letivo."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-calendar",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Calendário",
    "rota": "/student/calendar",
    "quemUsa": "Alunos.",
    "resumo": "Agenda mensal com as datas do calendário acadêmico (provas, feriados e eventos), os prazos de entrega das atividades e os vencimentos das cobranças, com filtros por tipo e a grade semanal do aluno."
  },
  {
    "passos": [
      "Localizar o documento pela busca ou pelo filtro de origem (institucional ou disciplina).",
      "Selecionar \"Baixar\" para salvar o arquivo."
    ],
    "observacoes": [],
    "id": "student-documents",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Documentos",
    "rota": "/student/documents",
    "quemUsa": "Alunos.",
    "resumo": "Central de documentos: documentos institucionais (por exemplo, regulamentos) e documentos das disciplinas em que o aluno está matriculado (por exemplo, planos de ensino e ementas).",
    "efeitos": "Os documentos são disponibilizados pela coordenação e pelos professores na gestão acadêmica do Rooster Academy; documentos de disciplinas não cursadas pelo aluno não são exibidos."
  },
  {
    "passos": [
      "Utilizar \"Baixar boleto\" para obter o boleto da cobrança em aberto e \"Copiar código PIX\" para pagamento por PIX.",
      "Baixar a nota fiscal da cobrança, quando emitida."
    ],
    "observacoes": [],
    "id": "student-finance",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Financeiro",
    "rota": "/student/finance",
    "quemUsa": "Alunos.",
    "resumo": "Situação financeira do aluno: valores em aberto, vencidos e pagos no ano, desconto vigente, próximo vencimento, histórico de pagamentos e relação de cobranças.",
    "efeitos": "As informações provêm do Rooster Finance (capítulo 10), restritas às cobranças do próprio aluno."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "student-notifications",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Notificações",
    "rota": "/student/notifications",
    "quemUsa": "Alunos.",
    "resumo": "Mesma central de avisos do capítulo 1, apresentada no portal do aluno."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "item-cursos-livres-boost-do-menu",
    "origem": "manual-tela",
    "modulo": "Rooster Student",
    "titulo": "Cursos livres (Boost)",
    "rota": null,
    "quemUsa": "Alunos.",
    "resumo": "Atalho para o portal do Rooster Boost (capítulo 9), em que o aluno realiza os cursos livres. O acesso ao portal é feito com o mesmo e-mail e a mesma senha do Rooster One, pela opção \"Aluno da instituição\"."
  },
  {
    "passos": [
      "A gestão cria o curso, monta módulos e aulas, configura o certificado e vincula os orientadores.",
      "A gestão publica o curso, que passa a constar do catálogo.",
      "O aluno se matricula pelo catálogo, ou é matriculado pela gestão.",
      "O aluno assiste às aulas e conversa com os orientadores.",
      "Concluídas as aulas, o certificado é emitido e pode ser verificado por qualquer pessoa."
    ],
    "observacoes": [
      "Curso livre: curso extracurricular, organizado em módulos e aulas, com carga horária e, opcionalmente, certificado.",
      "Situação do curso: rascunho (em montagem), publicado (no catálogo) ou arquivado.",
      "Conta do portal: acesso ao portal do Boost: institucional (mesmo login do Rooster One) ou externa (login próprio).",
      "Matrícula: vínculo do aluno ao curso; situação ativa, concluída ou cancelada.",
      "Orientador: professor vinculado ao curso, que responde às dúvidas dos alunos.",
      "Certificado: documento emitido automaticamente na conclusão do curso, com código de verificação público."
    ],
    "id": "modulo-rooster-boost",
    "origem": "manual-modulo",
    "modulo": "Rooster Boost",
    "titulo": "Rooster Boost — Cursos livres: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Boost é uma plataforma de cursos livres destinada aos alunos e funcionários da instituição e também ao público externo. Os alunos da instituição acessam o portal com o mesmo login do Rooster One, sem cadastro adicional; o aluno externo utiliza conta própria do portal, criada no cadastro público ou pela administração. O módulo divide-se em duas partes: o portal do aluno, em que se realizam os cursos e se conversa com os orientadores, e a gestão, no sistema principal, utilizada por quem administra os cursos, matricula alunos e orienta. O portal é acessado pelo endereço /boost-portal, pelo link \"acessar o Rooster Boost\" da tela de login, pelo item \"Cursos livres (Boost)\" do menu do Rooster Student ou pelo item \"Portal do aluno\" do menu do Rooster Boost."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "boost-portal",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Catálogo de cursos (portal público)",
    "rota": "/boost-portal",
    "quemUsa": "Qualquer pessoa, inclusive sem cadastro.",
    "resumo": "Relação dos cursos publicados, disponíveis para matrícula, com busca e filtro por categoria."
  },
  {
    "passos": [
      "Informar nome, e-mail e senha.",
      "Selecionar \"Criar conta\"; a conta pode ser utilizada imediatamente para o login."
    ],
    "observacoes": [],
    "id": "boost-portal-cadastro",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Cadastro",
    "rota": "/boost-portal/cadastro",
    "quemUsa": "Pessoas externas à instituição, sem conta no portal.",
    "resumo": "Criação de conta própria do portal, com nome, e-mail e senha (mínimo de 8 caracteres).",
    "efeitos": "O cadastro destina-se ao público externo. O aluno da instituição não precisa cadastrar-se: acessa o portal com a conta institucional, na opção \"Aluno da instituição\" da tela Entrar."
  },
  {
    "passos": [
      "Aluno da instituição: selecionar \"Aluno da instituição\" e informar o mesmo e-mail e a mesma senha do Rooster One. No primeiro acesso, a conta do portal é criada automaticamente.",
      "Aluno externo: selecionar \"Aluno externo\" e informar o e-mail e a senha da conta do portal.",
      "Selecionar \"Entrar\"; o sistema exibe o painel com os cursos do aluno."
    ],
    "observacoes": [],
    "id": "boost-portal-entrar",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Entrar",
    "rota": "/boost-portal/entrar",
    "quemUsa": "Alunos da instituição e alunos externos.",
    "resumo": "Login do portal, com duas opções de acesso.",
    "efeitos": "O aluno da instituição que esquecer a senha deve recuperá-la na tela de login do Rooster One (capítulo 1); o aluno externo utiliza o link \"Esqueci minha senha\", exibido na opção \"Aluno externo\". A conta institucional desativada no Rooster Hub perde também o acesso ao portal."
  },
  {
    "passos": [
      "Na tela Entrar, selecionar \"Aluno externo\" e, em seguida, \"Esqueci minha senha\".",
      "Informar o e-mail da conta e selecionar \"Enviar link de redefinição\". Por segurança, a mensagem de confirmação é a mesma em qualquer caso, inclusive quando o e-mail não está cadastrado.",
      "Acessar o link recebido por e-mail (válido por 1 hora e de uso único). Um novo pedido invalida os links anteriores."
    ],
    "observacoes": [],
    "id": "boost-portal-esqueci-senha",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Recuperação de senha do aluno externo",
    "rota": "/boost-portal/esqueci-senha",
    "quemUsa": "Alunos externos.",
    "resumo": "Solicitação do link de definição de nova senha da conta do portal, sem intervenção da administração.",
    "efeitos": "O aluno da instituição não utiliza esta tela: a senha do portal é a mesma do Rooster One. Se o e-mail informado pertencer a conta institucional, a mensagem recebida orienta a recuperação da senha no sistema da instituição."
  },
  {
    "passos": [
      "Informar e confirmar a nova senha (mínimo de 8 caracteres) e selecionar \"Redefinir senha\".",
      "Selecionar \"Entrar com a nova senha\"."
    ],
    "observacoes": [],
    "id": "boost-portal-redefinir-senha",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Definição da nova senha do aluno externo",
    "rota": "/boost-portal/redefinir-senha",
    "quemUsa": "Alunos externos.",
    "resumo": "Tela aberta pelo link recebido por e-mail.",
    "efeitos": "O link expirado, já utilizado ou inválido é recusado, com a orientação de solicitar novo link."
  },
  {
    "passos": [
      "Consultar o conteúdo programático.",
      "Selecionar \"Matricular-se gratuitamente\" (requer login; o visitante é conduzido à tela Entrar)."
    ],
    "observacoes": [],
    "id": "boost-portal-cursos-slug",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Página do curso e matrícula",
    "rota": null,
    "quemUsa": "Visitantes e alunos cadastrados no Boost.",
    "resumo": "Detalhes do curso: descrição, carga horária, nível, orientadores, módulos e títulos das aulas."
  },
  {
    "passos": [
      "Selecionar \"Continuar\" no curso desejado para abrir as aulas (seção seguinte)."
    ],
    "observacoes": [],
    "id": "boost-portal-painel",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Meus cursos",
    "rota": "/boost-portal/painel",
    "quemUsa": "Alunos matriculados no Boost.",
    "resumo": "Painel do aluno no portal, com os cursos em que está matriculado, o progresso de cada um e o certificado dos cursos concluídos."
  },
  {
    "passos": [
      "Selecionar a aula na relação de módulos e aulas.",
      "Assistir à aula; nas aulas em vídeo hospedado, a reprodução é retomada do ponto em que foi interrompida, e a aula é concluída automaticamente ao atingir 90% assistidos. As demais aulas são concluídas pelo botão \"Marcar como concluída\".",
      "Baixar os materiais de apoio disponibilizados.",
      "Enviar dúvidas aos orientadores do curso pela conversa do curso.",
      "Ao concluir todas as aulas, o certificado é emitido automaticamente, quando o curso o prevê, sem solicitação nem aprovação."
    ],
    "observacoes": [],
    "id": "boost-portal-painel-matriculaid",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Aulas do curso",
    "rota": null,
    "quemUsa": "Alunos matriculados no Boost.",
    "resumo": "Área em que o aluno assiste às aulas (vídeo ou texto), obtém materiais de apoio, conversa com os orientadores e acompanha o progresso no curso.",
    "efeitos": "O texto do certificado (com o nome do aluno, o curso, a carga horária e a data) é definido pela gestão do curso, e o código impresso permite a verificação pública."
  },
  {
    "passos": [
      "Informar o código do certificado e selecionar \"Conferir\".",
      "Consultar o resultado: certificado autêntico (com nome do aluno, curso, carga horária e data) ou não encontrado."
    ],
    "observacoes": [],
    "id": "boost-portal-verificar",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Verificação de certificado",
    "rota": "/boost-portal/verificar",
    "quemUsa": "Qualquer pessoa, inclusive sem cadastro (por exemplo, empregadores).",
    "resumo": "Conferência da autenticidade de certificado do Boost pelo código nele impresso.",
    "efeitos": "A falha de comunicação com o servidor é informada separadamente e não significa certificado inválido."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "boost",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Cursos (gestão)",
    "rota": "/boost",
    "quemUsa": "Gestão do Boost (no sistema principal).",
    "resumo": "Relação de todos os cursos, com indicadores (cursos, publicados, alunos matriculados e cursos com certificado) e o botão \"Novo curso\".",
    "efeitos": "Não há responsável exclusivo por curso: o usuário com permissão de gestão atua sobre todos os cursos. A retirada de publicação remove o curso do catálogo e impede novas matrículas, preservando o acesso dos alunos já matriculados."
  },
  {
    "passos": [
      "Detalhes: título, descrição, categoria, carga horária, nível, capa e situação (rascunho, publicado ou arquivado).",
      "Conteúdo: criar os módulos e, em cada um, as aulas, definindo o formato (texto, vídeo enviado ao sistema, até 2 GB, ou link externo) e incluindo materiais de apoio (até 25 MB).",
      "Certificado: ativar a emissão e definir o texto impresso.",
      "Orientadores: vincular os professores responsáveis pelas dúvidas dos alunos do curso.",
      "Alunos: acompanhar o progresso dos matriculados e, com a permissão de matrícula, selecionar \"Matricular aluno\", buscar o aluno da instituição ou o aluno externo pelo nome ou pelo e-mail e selecionar \"Matricular\". A matrícula ativa pode ser cancelada pela opção \"Cancelar matrícula\".",
      "Publicar o curso quando concluído, alterando a situação para \"Publicado\"; somente então ele é exibido no catálogo público."
    ],
    "observacoes": [],
    "id": "boost-manage-id",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Gestão de um curso",
    "rota": null,
    "quemUsa": "Gestão do Boost.",
    "resumo": "Montagem e acompanhamento do curso, nas abas Detalhes, Conteúdo, Certificado, Orientadores e Alunos.",
    "efeitos": "Os orientadores visualizam apenas as conversas dos cursos a que estão vinculados. O aluno da instituição matriculado pela gestão acessa o curso no portal com a conta institucional; a matrícula cancelada pode ser refeita, e a matrícula concluída não pode ser cancelada."
  },
  {
    "passos": [
      "Selecionar a conversa na lista, à esquerda.",
      "Redigir a resposta e selecionar \"Enviar\"."
    ],
    "observacoes": [],
    "id": "boost-conversas",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Conversas com alunos",
    "rota": "/boost/conversas",
    "quemUsa": "Orientadores.",
    "resumo": "Resposta às dúvidas dos alunos dos cursos em que o usuário é orientador, com indicação das mensagens não lidas e atualização em tempo real."
  },
  {
    "passos": [
      "Cadastro: selecionar \"Novo aluno externo\", informar nome e e-mail e, opcionalmente, a senha inicial (mínimo de 8 caracteres), e salvar. Sem senha informada, o sistema gera senha temporária, exibida uma única vez, a ser repassada ao aluno por canal seguro.",
      "Edição: selecionar \"Editar\" para alterar nome ou e-mail do aluno externo.",
      "Redefinição de senha: selecionar \"Redefinir senha\"; a nova senha temporária é exibida uma única vez.",
      "Desativação: selecionar \"Desativar\"; a conta deixa de acessar o portal e pode ser reativada.",
      "Exclusão: disponível apenas para conta sem matrícula; a conta com matrícula deve ser desativada, para preservar o histórico."
    ],
    "observacoes": [],
    "id": "boost-students",
    "origem": "manual-tela",
    "modulo": "Rooster Boost",
    "titulo": "Alunos do portal",
    "rota": "/boost/students",
    "quemUsa": "Administradores.",
    "resumo": "Cadastro das contas de acesso ao portal: alunos externos e contas de alunos da instituição, criadas automaticamente no primeiro acesso.",
    "efeitos": "As contas de alunos da instituição são identificadas como \"Institucional\" e não oferecem edição nem redefinição de senha, pois nome, e-mail e senha são os do Rooster One, mantidos no Rooster Hub."
  },
  {
    "passos": [
      "Cadastrar os serviços (por exemplo, a mensalidade), os produtos, as políticas de multa e juros e os descontos.",
      "Gerar as mensalidades da competência em lote; lançar cobranças avulsas quando necessário.",
      "Emitir boletos; o aluno os obtém também pelo portal.",
      "Registrar os pagamentos e, quando necessário, renegociar ou cancelar cobranças.",
      "Emitir notas fiscais e acompanhar os relatórios e a inadimplência."
    ],
    "observacoes": [
      "Cobrança: valor devido por um aluno, de um dos tipos: mensalidade, produto, serviço ou taxa.",
      "Situação da cobrança: em aberto, vencida (em aberto após o vencimento), paga, negociada ou cancelada.",
      "Competência: mês e ano a que se refere a mensalidade.",
      "Desconto ou bolsa: redução aplicada às mensalidades do aluno, percentual ou em valor fixo, com vigência.",
      "Política de multa e juros: regra de acréscimo por atraso: multa percentual, juros diários e dias de carência."
    ],
    "id": "modulo-rooster-finance",
    "origem": "manual-modulo",
    "modulo": "Rooster Finance",
    "titulo": "Rooster Finance — Financeiro: o que é e como funciona",
    "rota": null,
    "resumo": "O Rooster Finance controla as cobranças da instituição: mensalidades, produtos, serviços e taxas. É utilizado pela equipe financeira; as informações do aluno são acessadas pelo Rooster Student (capítulo 8). Boleto, PIX e nota fiscal são documentos internos do sistema, sem integração com instituição financeira e sem validade fiscal."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "finance",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Painel",
    "rota": "/finance",
    "quemUsa": "Equipe financeira.",
    "resumo": "Resumo financeiro do ano: receita prevista e recebida, cobranças em aberto, boletos vencidos, inadimplentes, receita por mês, mensalidades recentes, últimos pagamentos, próximos vencimentos e alertas de estoque baixo."
  },
  {
    "passos": [],
    "observacoes": [
      "Criação de cobrança avulsa (\"Nova cobrança\").",
      "Registro de pagamento, com valor, data e forma de pagamento.",
      "Renegociação de cobrança (novo valor e vencimento, com motivo).",
      "Cancelamento, com indicação do motivo.",
      "Exportação da relação em CSV."
    ],
    "id": "finance-charges",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Cobranças",
    "rota": "/finance/charges",
    "quemUsa": "Equipe financeira.",
    "resumo": "Todas as cobranças geradas para os alunos, de qualquer tipo (mensalidade, produto, serviço ou taxa), com filtros por tipo e situação.",
    "efeitos": "Toda cobrança está vinculada a aluno cadastrado no Rooster Academy. O pagamento, a renegociação e o cancelamento são notificados ao aluno e registrados em auditoria."
  },
  {
    "passos": [
      "Selecionar \"Gerar em lote\" e informar a competência (mês e ano).",
      "O sistema cria a mensalidade de cada aluno com matrícula ativa, aplicando automaticamente o desconto ou a bolsa vigente.",
      "A nova geração da mesma competência não duplica cobranças, pois o sistema identifica as já existentes."
    ],
    "observacoes": [],
    "id": "finance-tuitions",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Mensalidades",
    "rota": "/finance/tuitions",
    "quemUsa": "Equipe financeira.",
    "resumo": "Geração das mensalidades de todos os alunos de uma só vez, por competência, e consulta das mensalidades geradas.",
    "efeitos": "O valor provém do serviço de mensalidade cadastrado (tela Serviços) e do desconto vigente do aluno (tela Descontos)."
  },
  {
    "passos": [
      "Localizar a cobrança e emitir o boleto.",
      "Baixar o boleto emitido; o aluno pode baixá-lo e utilizar o código PIX no próprio portal."
    ],
    "observacoes": [],
    "id": "finance-boletos",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Boletos",
    "rota": "/finance/boletos",
    "quemUsa": "Equipe financeira; o aluno obtém o próprio boleto pelo Rooster Student.",
    "resumo": "Emissão do boleto e do código PIX de uma cobrança e download do boleto emitido."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "finance-products",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Produtos",
    "rota": "/finance/products",
    "quemUsa": "Equipe financeira.",
    "resumo": "Cadastro dos itens comercializados ao aluno (por exemplo, apostilas e uniformes), com preço, estoque e estoque mínimo; o estoque abaixo do mínimo é destacado."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "finance-services",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Serviços",
    "rota": "/finance/services",
    "quemUsa": "Equipe financeira.",
    "resumo": "Cadastro dos serviços cobrados (por exemplo, mensalidade e segunda via de documento), com valor, frequência (única, mensal, semestral ou anual) e política de multa e juros."
  },
  {
    "passos": [
      "Selecionar \"Emitir nota\" e escolher a cobrança.",
      "Baixar o PDF ou exportar o arquivo XML da nota."
    ],
    "observacoes": [],
    "id": "finance-nfe",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Notas fiscais",
    "rota": "/finance/nfe",
    "quemUsa": "Equipe financeira.",
    "resumo": "Emissão de nota fiscal interna para cobrança de serviço (NFS) ou de produto (NFP)."
  },
  {
    "passos": [
      "Utilizar \"Exportar CSV\" para salvar os dados."
    ],
    "observacoes": [],
    "id": "finance-reports",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Relatórios",
    "rota": "/finance/reports",
    "quemUsa": "Equipe financeira e gestão.",
    "resumo": "Relatórios de receita mensal, valores pendentes, fluxo de caixa e inadimplência, calculados a partir das cobranças registradas."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "finance-discounts",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Descontos",
    "rota": "/finance/discounts",
    "quemUsa": "Equipe financeira.",
    "resumo": "Cadastro de descontos e bolsas (bolsa integral ou parcial, desconto percentual ou fixo, convênio e promoção), com vigência, e sua atribuição a alunos.",
    "efeitos": "O desconto atribuído ao aluno é aplicado automaticamente na geração das mensalidades."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "finance-policies",
    "origem": "manual-tela",
    "modulo": "Rooster Finance",
    "titulo": "Políticas de multa e juros",
    "rota": "/finance/policies",
    "quemUsa": "Equipe financeira.",
    "resumo": "Regras de multa e juros por atraso, aplicáveis a serviço (por exemplo, a todas as mensalidades) ou a cobrança específica.",
    "efeitos": "A cobrança vencida tem multa e juros calculados automaticamente conforme a política vinculada; valores informados manualmente na cobrança prevalecem sobre a política. Política em uso não pode ser excluída."
  },
  {
    "passos": [],
    "observacoes": [
      "Rooster Hub: Usuários, setores, permissões, auditoria e registro de erros.; Administradores",
      "Rooster Desk: Chamados de suporte, com setor responsável, prazo de atendimento (SLA) e conversa.; Todos (abertura); equipe de atendimento",
      "Rooster Rooms: Reserva de salas, laboratórios e auditórios, com aprovação.; Professores e funcionários; gestão de ambientes",
      "Rooster Assets: Patrimônio: cadastro, localização, movimentação, manutenção e empréstimo de bens.; Equipe de patrimônio",
      "Rooster Academy: Cursos, disciplinas, turmas, matrículas, frequência e notas.; Coordenação acadêmica e professores",
      "Rooster Learn: Atividades com questões, entregas dos alunos e correção.; Professores e alunos",
      "Rooster Student: Portal do aluno: disciplinas, notas, frequência, documentos e financeiro.; Alunos",
      "Rooster Boost: Cursos livres, com portal próprio, orientadores e certificado.; Alunos, público externo e gestão de cursos",
      "Rooster Finance: Cobranças, mensalidades, boletos, notas fiscais, descontos e relatórios.; Equipe financeira"
    ],
    "id": "visao-geral-modulos-do-sistema",
    "origem": "manual-visao-geral",
    "modulo": "Geral",
    "titulo": "Módulos do sistema",
    "rota": null,
    "resumo": ""
  },
  {
    "passos": [],
    "observacoes": [
      "Administrador: Cadastra usuários e setores, concede permissões e acompanha a auditoria.; Hub (e, conforme as permissões, todos os demais)",
      "Coordenação acadêmica: Organiza cursos, turmas e matrículas e acompanha as turmas.; Academy, Learn, Boost",
      "Professor: Registra frequência e notas, cria e corrige atividades, reserva salas e orienta cursos livres.; Academy, Learn, Rooms, Boost",
      "Coordenação de suporte e atendentes: Atende chamados, configura categorias e prazos.; Desk",
      "Gestão de ambientes: Mantém a estrutura física e decide sobre as reservas.; Rooms",
      "Equipe de patrimônio: Cadastra e movimenta bens e controla empréstimos.; Assets",
      "Equipe financeira: Gera mensalidades, registra pagamentos e emite documentos.; Finance",
      "Aluno: Consulta a vida acadêmica, responde atividades e realiza cursos livres.; Student, Learn, Boost",
      "Aluno externo: Pessoa sem vínculo com a instituição, que realiza cursos livres.; Somente o portal do Boost"
    ],
    "id": "visao-geral-perfis-de-usuario",
    "origem": "manual-visao-geral",
    "modulo": "Geral",
    "titulo": "Perfis de usuário",
    "rota": null,
    "resumo": "O sistema não atribui perfis fixos: cada pessoa recebe, no Rooster Hub, as permissões necessárias às suas atividades. Os perfis abaixo descrevem as combinações mais comuns e servem de referência para a leitura deste manual."
  },
  {
    "passos": [],
    "observacoes": [
      "O cadastro de pessoas é único (Rooster Hub): professores e alunos do Academy são usuários do Hub com vínculo acadêmico, e o mesmo login dá acesso ao portal do Boost.",
      "A atividade do Rooster Learn publicada com peso torna-se item avaliativo no Academy, e a nota da correção, inclusive a calculada automaticamente, integra a média do aluno.",
      "Notas, frequência, atividades, documentos e cobranças são reunidos no Rooster Student, sempre restritos ao próprio aluno.",
      "A reserva de sala no Rooms pode ser vinculada à turma do Academy; as cobranças do Finance referem-se aos alunos do Academy.",
      "O setor do usuário (Hub) determina os chamados que lhe são exibidos no Desk.",
      "Os eventos relevantes de todos os módulos (resposta em chamado, decisão de reserva, nota lançada, atividade publicada ou corrigida, cobrança) geram aviso na central de notificações."
    ],
    "id": "visao-geral-integracao-entre-os-modulos",
    "origem": "manual-visao-geral",
    "modulo": "Geral",
    "titulo": "Integração entre os módulos",
    "rota": null,
    "resumo": "As informações registradas em um módulo são aproveitadas pelos demais, sem novo lançamento:"
  },
  {
    "passos": [],
    "observacoes": [
      "Barra superior: busca global (atalho Ctrl+K), notificações (sino), alternância entre tema claro e escuro, configurações e encerramento da sessão.",
      "Listagens: campo de busca e filtros acima da tabela; o resultado é atualizado à medida que os critérios são informados.",
      "Formatos: datas no padrão dd/mm/aaaa, horários no formato de 24 horas e valores em reais, com vírgula decimal (por exemplo, R$ 1.250,00).",
      "Confirmações: o resultado de cada operação é informado por aviso no canto da tela; exclusões e cancelamentos exigem confirmação.",
      "Permissões: botões e telas não autorizados não são exibidos; a ausência de uma opção indica falta de permissão, e não falha do sistema."
    ],
    "id": "visao-geral-convencoes-da-interface",
    "origem": "manual-visao-geral",
    "modulo": "Geral",
    "titulo": "Convenções da interface",
    "rota": null,
    "resumo": ""
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-orientacao-sobre-a-utilizacao-de-uma-tela-ou-tarefa",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Orientação sobre a utilização de uma tela ou tarefa",
    "rota": null,
    "resumo": "Utilizar o assistente de dúvidas (capítulo 1), pelo botão no canto inferior direito, descrevendo a tarefa em linguagem comum; nas tarefas principais, a opção \"Mostrar na tela\" conduz a execução passo a passo. Para problemas no funcionamento do sistema, deve ser aberto um chamado no Rooster Desk."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-procedimento-em-caso-de-esquecimento-da-senha",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Procedimento em caso de esquecimento da senha",
    "rota": null,
    "resumo": "Utilizar o link \"Esqueci minha senha\", na tela de login (capítulo 1), que envia ao e-mail cadastrado um link para a definição de nova senha. Se a mensagem não for recebida em alguns minutos, recomenda-se verificar a pasta de spam antes de repetir a solicitação. No portal do Boost, o aluno da instituição utiliza o mesmo procedimento, e o aluno externo, o link da opção \"Aluno externo\"."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-ausencia-de-modulo-ou-tela-no-menu",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Ausência de módulo ou tela no menu",
    "rota": null,
    "resumo": "A ausência decorre, em regra, da falta de permissão, e não de falha técnica: o menu exibe apenas o que as permissões do usuário autorizam. O acesso deve ser solicitado ao administrador do sistema (Rooster Hub), com a indicação da necessidade."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-chamado-sem-resposta",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Chamado sem resposta",
    "rota": null,
    "resumo": "Cada categoria de chamado possui prazo esperado de resposta (SLA). Ultrapassado o prazo, é possível enviar mensagem no próprio chamado solicitando informação sobre o andamento."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-reserva-de-ambiente-em-analise",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Reserva de ambiente em análise",
    "rota": null,
    "resumo": "As reservas não são confirmadas automaticamente: dependem de aprovação da equipe de gestão dos ambientes. O andamento pode ser acompanhado em \"Minhas reservas\", inclusive com o envio de mensagem à equipe."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-atividade-nao-exibida-ao-aluno",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Atividade não exibida ao aluno",
    "rota": null,
    "resumo": "O aluno visualiza apenas as atividades publicadas das turmas em que está matriculado. A atividade em rascunho deve ser publicada pelo professor, e a matrícula do aluno deve ser conferida pela coordenação no Rooster Academy."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-nota-do-rooster-learn-ausente-no-boletim",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Nota do Rooster Learn ausente no boletim",
    "rota": null,
    "resumo": "Somente a atividade publicada com peso maior que zero compõe a média no Rooster Academy. A nota é propagada no momento da correção; entrega reenviada pelo aluno invalida a correção anterior e deve ser corrigida novamente."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-questoes-da-atividade-bloqueadas-para-edicao",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Questões da atividade bloqueadas para edição",
    "rota": null,
    "resumo": "Após a primeira entrega, as questões não podem ser alteradas, para preservar as respostas já enviadas. Para corrigir uma questão, recomenda-se criar nova atividade, ou ajustar a pontuação na correção."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-divergencia-em-nota-ou-frequencia",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Divergência em nota ou frequência",
    "rota": null,
    "resumo": "O professor da disciplina, responsável pelo lançamento dessas informações, deve ser procurado. Persistindo a divergência, recomenda-se abrir chamado no Rooster Desk, na categoria \"Sistemas Acadêmicos\"."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-ausencia-de-notificacoes",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Ausência de notificações",
    "rota": null,
    "resumo": "Os avisos permanecem disponíveis no ícone de sino da barra superior, mesmo sem alerta visual no momento do evento. Persistindo a ausência, recomenda-se abrir chamado relatando a situação."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "faq-suporte-sobre-o-proprio-sistema",
    "origem": "faq",
    "modulo": "Geral",
    "titulo": "Suporte sobre o próprio sistema",
    "rota": null,
    "resumo": "O canal oficial de suporte, inclusive para dúvidas sobre a utilização do Rooster One, é a abertura de chamado no Rooster Desk (capítulo 3)."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-anexo",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Anexo\"",
    "rota": null,
    "resumo": "Anexo: arquivo enviado junto a um chamado, entrega ou mensagem."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-assistente-de-duvidas",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Assistente de dúvidas\"",
    "rota": null,
    "resumo": "Assistente de dúvidas: recurso do sistema que responde a perguntas sobre a utilização das telas, com base neste manual."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-auditoria",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Auditoria\"",
    "rota": null,
    "resumo": "Auditoria: registro automático das ações relevantes realizadas no sistema, com autor e data."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-bolsa",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Bolsa\"",
    "rota": null,
    "resumo": "Bolsa: desconto concedido ao aluno nas mensalidades, integral ou parcial."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-certificado",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Certificado\"",
    "rota": null,
    "resumo": "Certificado: documento de conclusão de curso livre do Boost, com código de verificação."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-competencia",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Competência\"",
    "rota": null,
    "resumo": "Competência: mês e ano de referência de uma mensalidade."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-csv",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"CSV\"",
    "rota": null,
    "resumo": "CSV: formato de planilha simples, aberto por programas como o Excel."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-entrega",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Entrega\"",
    "rota": null,
    "resumo": "Entrega: resposta do aluno a uma atividade do Rooster Learn."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-gabarito",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Gabarito\"",
    "rota": null,
    "resumo": "Gabarito: resposta correta das questões objetivas."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-item-avaliativo",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Item avaliativo\"",
    "rota": null,
    "resumo": "Item avaliativo: avaliação de uma turma, com peso e nota máxima, que compõe a média."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-matricula",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Matrícula\"",
    "rota": null,
    "resumo": "Matrícula: vínculo do aluno a uma turma (Academy) ou a um curso livre (Boost)."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-notificacao",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Notificação\"",
    "rota": null,
    "resumo": "Notificação: aviso exibido na central de notificações sobre evento relacionado ao usuário."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-periodo-letivo",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Período letivo\"",
    "rota": null,
    "resumo": "Período letivo: semestre ou ano letivo."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-permissao",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Permissão\"",
    "rota": null,
    "resumo": "Permissão: autorização para uma ação em uma tela de um módulo."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-pix",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"PIX\"",
    "rota": null,
    "resumo": "PIX: código de pagamento instantâneo exibido junto ao boleto (simulado, de uso interno)."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-portal-do-boost",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Portal do Boost\"",
    "rota": null,
    "resumo": "Portal do Boost: área pública de cursos livres, acessada pelo endereço /boost-portal."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-roteiro-guiado",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Roteiro guiado\"",
    "rota": null,
    "resumo": "Roteiro guiado: condução passo a passo de uma tarefa na própria tela, com o campo do passo em destaque e legenda explicativa."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-setor",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Setor\"",
    "rota": null,
    "resumo": "Setor: agrupamento de usuários por área de atuação."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-sla",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"SLA\"",
    "rota": null,
    "resumo": "SLA: prazo esperado de atendimento de um chamado."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "glossario-turma",
    "origem": "glossario",
    "modulo": "Geral",
    "titulo": "O que significa \"Turma\"",
    "rota": null,
    "resumo": "Turma: oferta de uma disciplina em um período letivo, com professor e alunos matriculados."
  },
  {
    "passos": [
      "Copiar as pastas do sistema (RoosterOneBackend e RoosterOneFrontEnd) para a mesma pasta do computador.",
      "Abrir a pasta RoosterOneBackend, depois scripts e instalador, e executar INSTALAR.bat com duplo clique.",
      "Confirmar a solicitação de permissão de administrador do Windows.",
      "No menu, escolher a opção 1 (\"Instalação completa\"). O instalador instala, quando necessário, o Node.js e o banco de dados PostgreSQL, cria o banco, compila o sistema e registra o início automático. A primeira instalação leva de 10 a 20 minutos, conforme a internet e o computador.",
      "Responder \"s\" à pergunta sobre os dados de demonstração, para carregar os usuários e as informações de exemplo do Apêndice B, ou \"n\", para iniciar com o sistema vazio.",
      "Ao final, o navegador é aberto na tela de login, e o atalho \"Rooster One\" é criado na área de trabalho."
    ],
    "observacoes": [
      "1. Instalação completa: Instala ou atualiza o sistema; pode ser repetida sem perda de dados.",
      "2. Iniciar o sistema: Inicia o sistema e abre o navegador.",
      "3. Parar o sistema: Encerra o sistema até o próximo início (ou até a opção 2).",
      "4. Ver situação: Indica se o banco de dados, a API e o site estão funcionando.",
      "5. Verificar pré-requisitos: Confere o computador sem alterar nada.",
      "6. Fazer backup: Copia o banco de dados e os arquivos enviados para a pasta backups.",
      "7. Restaurar dados de demonstração: Apaga todos os dados e recarrega os dados de exemplo (exige digitar APAGAR).",
      "8. Desinstalar: Remove o início automático e o atalho; opcionalmente, exclui o banco de dados."
    ],
    "id": "instalacao-do-sistema",
    "origem": "instalacao",
    "modulo": "Geral",
    "titulo": "Instalação e inicialização do sistema",
    "rota": null,
    "resumo": "Esta seção destina-se a quem instala o Rooster One em um computador com Windows. A instalação é feita por um instalador com menu, que prepara tudo o que o sistema necessita e o deixa configurado para iniciar automaticamente sempre que o computador é ligado. Instalação sem internet: basta baixar o instalador do PostgreSQL para Windows (arquivo postgresql-...-windows-x64.exe, do site da EDB) e, se o computador não tiver o Node.js, o instalador do Node.js (arquivo node-...-x64.msi), e colocá-los, sem renomear, na pasta scriptsinstaladorinstaladores. O instalador os utiliza automaticamente, sem nenhuma tela adicional; a opção 5 do menu confirma quais arquivos serão usados. Após a instalação, nenhum procedimento é necessário: o sistema inicia junto com o Windows. Para acessá-lo, utiliza-se o atalho \"Rooster One\" da área de trabalho ou o endereço http://localhost:8080 no navegador. Recomenda-se realizar o backup periodicamente e guardar, junto com ele, uma cópia do arquivo .env da pasta RoosterOneBackend, que contém a chave necessária à leitura dos arquivos enviados ao sistema."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-acesso-ao-sistema",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Acesso ao sistema (guia do usuário)",
    "rota": null,
    "resumo": "O acesso é realizado na tela de login, com o e-mail e a senha cadastrados. Em caso de esquecimento da senha, a opção \"Esqueci minha senha\" envia ao e-mail informado um link de redefinição, válido por 1 hora e de uso único. A sessão é renovada automaticamente durante o uso; após a troca de senha, as sessões abertas em outros dispositivos são encerradas. A central de notificações, acessível pelo ícone da barra superior, reúne os avisos destinados ao usuário (respostas de chamado e de reserva, notas lançadas, atividades publicadas ou corrigidas e cobranças); a seleção de uma notificação conduz à tela correspondente."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-assistente-de-duvidas",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Assistente de dúvidas (guia do usuário)",
    "rota": null,
    "resumo": "O botão do assistente, no canto inferior direito de todas as telas, abre um chat em que a dúvida sobre o uso do sistema é escrita em linguagem comum (por exemplo, \"como abro um chamado?\" ou \"onde vejo minhas notas?\"). A resposta reproduz o trecho correspondente do Manual do Usuário, com a tela e o procedimento, e oferece \"Abrir a tela\" e os assuntos relacionados. Nas tarefas principais (abrir e responder chamado, reservar ambiente, aprovar reserva, cadastrar usuário, conceder permissões, registrar frequência, lançar notas, criar atividade, cadastrar questões, corrigir entregas, responder atividade, gerar mensalidades, registrar pagamento e cadastrar patrimônio), a opção \"Mostrar na tela\" inicia o roteiro guiado: a tela é escurecida, apenas o campo do passo permanece em destaque, e uma legenda explica o que fazer e por que o campo existe. O roteiro é oferecido apenas para as tarefas que o usuário tem permissão para executar e pode ser encerrado a qualquer momento pela tecla Esc. O assistente não consulta informações registradas (notas, cobranças, chamados) nem executa operações."
  },
  {
    "passos": [],
    "observacoes": [
      "Abertura de chamado: em \"Chamados\", opção \"Novo chamado\", com seleção da categoria e descrição da solicitação.",
      "Acompanhamento: a abertura do chamado na lista exibe o status atual, a conversa com o atendimento e os",
      "Notas internas: integrantes da equipe de atendimento podem marcar mensagens como \"nota interna\", não",
      "Avaliação: após o encerramento, o solicitante pode avaliar o atendimento."
    ],
    "id": "guia-rooster-desk-chamados-de-suporte",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Rooster Desk — chamados de suporte (guia do usuário)",
    "rota": null,
    "resumo": "anexos (imagens e documentos). As mensagens são atualizadas em tempo real. visíveis ao solicitante."
  },
  {
    "passos": [],
    "observacoes": [
      "Reserva: em \"Reservar\", seleção do ambiente, da data e de horário livre. A reserva pode ser única ou, para",
      "Acompanhamento: em \"Minhas reservas\", consulta do status (em análise, confirmada, recusada ou cancelada) e",
      "Cancelamento: o responsável pode cancelar a própria reserva, com indicação do motivo; em reserva recorrente, é"
    ],
    "id": "guia-rooster-rooms-reserva-de-ambientes",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Rooster Rooms — reserva de ambientes (guia do usuário)",
    "rota": null,
    "resumo": "usuários autorizados, recorrente (diária, semanal ou mensal, com até 26 ocorrências). A antecedência máxima é de 15 dias, salvo permissão de prazo estendido. conversa com a equipe de reservas sobre cada pedido. possível cancelar uma data ou a série inteira."
  },
  {
    "passos": [],
    "observacoes": [
      "Consulta: relação dos itens por categoria, setor responsável e situação (disponível, em uso, emprestado ou em",
      "Empréstimos e movimentações são registrados por usuários com permissão de gestão de patrimônio."
    ],
    "id": "guia-rooster-assets-patrimonio",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Rooster Assets — patrimônio (guia do usuário)",
    "rota": null,
    "resumo": "manutenção)."
  },
  {
    "passos": [],
    "observacoes": [
      "Turmas: consulta das turmas lecionadas, com alunos matriculados.",
      "Frequência: registro da chamada por data, para todos os alunos da turma.",
      "Notas: configuração dos itens avaliativos (peso e nota máxima) e lançamento das notas.",
      "Atividades: criação, publicação e correção de atividades no Learn; a nota da correção é incorporada"
    ],
    "id": "guia-rooster-academy-e-rooster-learn-professores",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Rooster Academy e Rooster Learn — professores (guia do usuário)",
    "rota": null,
    "resumo": "automaticamente à média da turma no Academy."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-rooster-student-portal-do-aluno",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Rooster Student — portal do aluno (guia do usuário)",
    "rota": null,
    "resumo": "O portal reúne, para o aluno autenticado: perfil acadêmico, disciplinas, atividades e entregas, notas e média, frequência, histórico, calendário acadêmico, documentos institucionais, notificações e financeiro (cobranças, desconto vigente, download de boleto e de nota fiscal)."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-rooster-boost-cursos-extracurriculares",
    "origem": "guia",
    "modulo": "Guia do usuário",
    "titulo": "Rooster Boost — cursos extracurriculares (guia do usuário)",
    "rota": null,
    "resumo": "O portal público do Boost permite a qualquer pessoa consultar o catálogo de cursos, cadastrar-se, matricular-se, assistir às aulas, conversar com os orientadores do curso e obter o certificado de conclusão, quando o curso o emitir. A autenticidade de um certificado pode ser verificada publicamente pelo código nele impresso."
  },
  {
    "passos": [],
    "observacoes": [
      "Criação: nome, e-mail e senha inicial (mínimo de 8 caracteres). O e-mail deve ser único no sistema.",
      "Redefinição de senha: na lista de usuários, a opção de redefinição (ícone de chave) define nova senha. O",
      "Desativação: recomenda-se a desativação, em lugar da exclusão, quando houver interesse em preservar o",
      "Proteção do último administrador: o sistema recusa a exclusão, a desativação e a revogação da permissão de"
    ],
    "id": "guia-gestao-de-usuarios-rooster-hub-usuarios",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Gestão de usuários (Rooster Hub → Usuários) (guia do administrador)",
    "rota": null,
    "resumo": "usuário não é avisado automaticamente por e-mail, e a comunicação deve ocorrer por canal separado. As sessões abertas do usuário são encerradas. histórico do usuário (chamados, reservas etc.). O usuário desativado perde o acesso de imediato. administrador do último administrador ativo."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-gestao-de-setores-rooster-hub-setores",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Gestão de setores (Rooster Hub → Setores) (guia do administrador)",
    "rota": null,
    "resumo": "O setor é a unidade utilizada para restringir o que atendentes e coordenadores visualizam; por exemplo, o chamado é exibido apenas aos integrantes do setor responsável pela categoria. Cada usuário deve ser vinculado aos setores correspondentes à sua função."
  },
  {
    "passos": [],
    "observacoes": [
      "A permissão é concedida diretamente ao usuário; não há cargo com conjunto predefinido de permissões. Cada",
      "Concessão de acesso de administrador: concessão da permissão \"Rooster Hub / Acessos e permissões / Gerenciar",
      "Recomenda-se a revisão periódica dos usuários com essa permissão, por ser a concessão mais sensível do sistema.",
      "Relatórios: na mesma tela, os usuários com as permissões correspondentes consultam e exportam em CSV o"
    ],
    "id": "guia-acessos-e-permissoes-rooster-hub-acessos-e-permissoes",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Acessos e permissões (Rooster Hub → Acessos e permissões) (guia do administrador)",
    "rota": null,
    "resumo": "permissão combina módulo, tela e ação (por exemplo, \"Rooster Desk / Chamados / Encerrar\"). permissões\". A partir dela, o sistema trata o usuário como administrador, com acesso irrestrito, sem outra configuração. relatório de auditoria (com o autor de cada ação) e o relatório de erros do servidor."
  },
  {
    "passos": [],
    "observacoes": [
      "O assistente está disponível a todos os usuários, sem permissão específica, e responde com o conteúdo do Manual do",
      "O conteúdo das respostas acompanha o Manual do Usuário. Após a alteração do manual"
    ],
    "id": "guia-assistente-de-duvidas-e-roteiros-guiados",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Assistente de dúvidas e roteiros guiados (guia do administrador)",
    "rota": null,
    "resumo": "Usuário. O roteiro guiado de cada tarefa, porém, é oferecido somente a quem possui a permissão da tarefa (por exemplo, \"Rooster Desk / Chamados / Abrir chamado\" para o roteiro de abertura de chamado); a concessão da permissão em Acessos e permissões libera também o roteiro. (docs/manual-usuario/manual.json), a equipe técnica regenera o documento Word (npm run manual) e a base de conhecimento do assistente (npm run assistente:base)."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-configuracoes-configuracoes-e-mail",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Configurações (Configurações → E-mail) (guia do administrador)",
    "rota": null,
    "resumo": "Exibe o estado do envio de e-mail (SMTP) e permite o envio de mensagem de teste. As credenciais do servidor de e-mail são definidas no arquivo de configuração do servidor, e não pela interface."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-categorias-e-equipe-de-atendimento-rooster-desk",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Categorias e equipe de atendimento (Rooster Desk) (guia do administrador)",
    "rota": null,
    "resumo": "Cada categoria de chamado é vinculada a um setor; os atendentes devem ser vinculados às subcategorias para que a atribuição de chamados funcione corretamente. A exibição do SLA depende da permissão \"ver SLA\"."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-estrutura-fisica-rooster-rooms",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Estrutura física (Rooster Rooms) (guia do administrador)",
    "rota": null,
    "resumo": "Campus, blocos e ambientes devem ser cadastrados antes de qualquer reserva. Cada ambiente possui capacidade, dias de funcionamento e janela de horário; reservas fora desses limites são recusadas automaticamente. As permissões de prazo estendido e de reserva recorrente devem ser concedidas apenas aos usuários que delas necessitem."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-patrimonio-rooster-assets",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Patrimônio (Rooster Assets) (guia do administrador)",
    "rota": null,
    "resumo": "Categorias e setores de patrimônio devem ser cadastrados antes dos itens. No registro de empréstimo, deve-se definir o prazo de devolução; o item passa a constar automaticamente da relação de \"Empréstimos atrasados\" do painel caso o prazo expire sem devolução registrada."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-estrutura-academica-rooster-academy",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Estrutura acadêmica (Rooster Academy) (guia do administrador)",
    "rota": null,
    "resumo": "A ordem recomendada de cadastro é: cursos, período letivo, disciplinas, vínculos de professor e de aluno (a partir de usuários existentes no Hub), turmas e matrículas. A matrícula respeita a capacidade da turma."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-cursos-extracurriculares-rooster-boost",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Cursos extracurriculares (Rooster Boost) (guia do administrador)",
    "rota": null,
    "resumo": "A gestão dos cursos é realizada por permissão, sem responsável exclusivo por curso: quem possui a permissão de gestão atua sobre todos os cursos. Os professores são vinculados como orientadores, apenas para a comunicação com os alunos. A tela \"Alunos do portal\" permite cadastrar alunos externos (com senha informada ou senha temporária, exibida uma única vez), editar nome e e-mail, desativar e reativar contas, excluir conta sem matrícula e gerar senha temporária. Os alunos da instituição acessam o portal com a conta institucional, sem cadastro adicional, e são matriculados nos cursos pela aba \"Alunos\" da gestão do curso (permissão boost.manage.matricular)."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-financeiro-rooster-finance",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Financeiro (Rooster Finance) (guia do administrador)",
    "rota": null,
    "resumo": "O cadastro de serviços (inclusive a mensalidade), produtos, descontos e políticas de multa e juros precede a geração de cobranças. A geração de mensalidades em lote é idempotente e pode ser repetida com segurança. Boleto e nota fiscal são documentos internos, sem integração bancária nem validade fiscal."
  },
  {
    "passos": [],
    "observacoes": [],
    "id": "guia-auditoria",
    "origem": "guia",
    "modulo": "Guia do administrador",
    "titulo": "Auditoria (guia do administrador)",
    "rota": null,
    "resumo": "Login, renovação de sessão, criação, edição e exclusão de usuário, concessão e revogação de permissão, redefinição de senha, lançamento de notas, transições de cobrança e gestão de contas externas do Boost são registrados automaticamente, com o autor da ação, e constam do relatório de auditoria e da \"Atividade recente\" do painel do Rooster Hub; não há registro manual."
  }
];
