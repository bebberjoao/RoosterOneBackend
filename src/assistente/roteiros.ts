/**
 * Roteiros guiados do assistente: tarefas para as quais o sistema conduz o usuário na própria tela (tela escurecida,
 * com destaque do campo e legenda). As etapas de cada roteiro ficam no frontend
 * (src/components/rooster/assistente/roteiros.ts); aqui ficam o vínculo com a entrada do manual e as frases de
 * exemplo, que treinam o motor de linguagem a reconhecer a intenção do usuário.
 */
export interface RoteiroGuiado {
  id: string;
  titulo: string;
  /** Entrada da base de conhecimento (tela do manual) explicada pelo roteiro. */
  entrada: string;
  /**
   * Permissão necessária para executar a tarefa (chave modulo.tela.acao do catálogo). O roteiro só é sugerido, e só
   * pode ser iniciado, por quem a possui.
   */
  permissao: string;
  exemplos: string[];
}

export const ROTEIROS: RoteiroGuiado[] = [
  {
    id: 'abrir-chamado', titulo: 'Abrir um chamado de suporte', entrada: 'desk-tickets', permissao: 'desk.tickets.criar',
    exemplos: [
      'como abro um chamado', 'abrir ticket', 'preciso de suporte', 'pedir ajuda ao suporte de ti', 'meu computador quebrou',
      'o projetor da sala não funciona', 'reportar um problema', 'solicitar atendimento', 'criar chamado', 'registrar um defeito',
      'a internet caiu', 'não consigo acessar o sistema, onde peço ajuda',
      'a impressora estragou', 'equipamento da sala com defeito', 'o ar condicionado não funciona', 'falar com a equipe de ti',
      'a rede está lenta', 'pedir manutenção', 'o sistema deu erro', 'quem resolve problemas de informática',
    ],
  },
  {
    id: 'responder-chamado', titulo: 'Acompanhar e responder um chamado', entrada: 'desk-tickets-id', permissao: 'desk.tickets.acessar',
    exemplos: [
      'responder o chamado', 'mandar mensagem no chamado', 'acompanhar meu chamado', 'ver a resposta do suporte',
      'conversar com o atendente', 'andamento do meu ticket', 'anexar arquivo no chamado', 'encerrar chamado',
    ],
  },
  {
    id: 'reservar-ambiente', titulo: 'Reservar uma sala ou ambiente', entrada: 'rooms-book', permissao: 'rooms.book.solicitar',
    exemplos: [
      'reservar sala', 'como reservo o auditório', 'agendar o laboratório', 'pedir uma sala para aula', 'marcar reunião numa sala',
      'solicitar reserva de ambiente', 'reserva recorrente toda semana', 'preciso de um espaço para um evento',
      'usar o auditório para uma palestra', 'ver se a sala está disponível', 'reservar o laboratório de informática',
    ],
  },
  {
    id: 'aprovar-reserva', titulo: 'Aprovar ou cancelar reservas', entrada: 'rooms-manage', permissao: 'rooms.manage.aprovar',
    exemplos: [
      'aprovar reserva', 'recusar pedido de sala', 'cancelar a reserva de outra pessoa', 'analisar solicitações de reserva',
      'gerenciar reservas pendentes', 'responder solicitante da reserva',
    ],
  },
  {
    id: 'cadastrar-usuario', titulo: 'Cadastrar um usuário', entrada: 'hub-usuarios', permissao: 'hub.usuarios.criar',
    exemplos: [
      'cadastrar usuário', 'criar conta para um funcionário', 'adicionar nova pessoa no sistema', 'criar login',
      'criar acesso para um professor novo', 'desativar usuário', 'redefinir a senha de um usuário',
    ],
  },
  {
    id: 'conceder-permissao', titulo: 'Conceder permissões a um usuário', entrada: 'hub-acessos', permissao: 'hub.acessos.conceder',
    exemplos: [
      'dar permissão', 'liberar acesso a um módulo', 'o usuário não vê o menu', 'conceder acesso', 'retirar permissão',
      'permissões do usuário', 'tornar alguém administrador', 'acesso negado para um colega', 'liberar o módulo para um funcionário',
      'colega não consegue entrar numa tela',
    ],
  },
  {
    id: 'registrar-frequencia', titulo: 'Registrar a frequência da turma', entrada: 'academy-attendance', permissao: 'academy.attendance.registrar-chamada',
    exemplos: [
      'fazer a chamada', 'registrar presença', 'lançar falta do aluno', 'marcar presença dos alunos', 'frequência da turma',
      'aluno chegou atrasado', 'falta justificada',
    ],
  },
  {
    id: 'lancar-notas', titulo: 'Lançar notas da turma', entrada: 'academy-grades', permissao: 'academy.grades.lancar-notas',
    exemplos: [
      'lançar notas', 'dar nota aos alunos', 'cadastrar avaliação da turma', 'configurar o peso da prova', 'itens avaliativos',
      'calcular média da turma', 'alterar nota de um aluno', 'colocar a nota da prova', 'onde registro as notas dos alunos',
    ],
  },
  {
    id: 'criar-atividade', titulo: 'Criar e publicar uma atividade', entrada: 'learn-classes', permissao: 'learn.classes.criar-atividade',
    exemplos: [
      'criar atividade', 'publicar uma prova', 'passar tarefa para a turma', 'nova lista de exercícios', 'criar trabalho para os alunos',
      'definir prazo de entrega', 'publicar atividade',
    ],
  },
  {
    id: 'cadastrar-questao', titulo: 'Cadastrar questões em uma atividade', entrada: 'learn-activities-id', permissao: 'learn.classes.editar-questoes',
    exemplos: [
      'adicionar questão', 'criar pergunta de múltipla escolha', 'colocar imagem na questão', 'cadastrar alternativas',
      'marcar a alternativa correta', 'questão de verdadeiro ou falso', 'questão discursiva', 'imagem de apoio',
    ],
  },
  {
    id: 'corrigir-entrega', titulo: 'Corrigir as entregas de uma atividade', entrada: 'learn-activities-id', permissao: 'learn.classes.corrigir',
    exemplos: [
      'corrigir entrega', 'corrigir as provas dos alunos', 'pontuar questão discursiva', 'avaliar o trabalho enviado',
      'dar nota na atividade', 'feedback para o aluno',
    ],
  },
  {
    id: 'responder-atividade', titulo: 'Responder uma atividade (aluno)', entrada: 'learn-student', permissao: 'learn.student.responder',
    exemplos: [
      'responder atividade', 'enviar meu trabalho', 'fazer a prova', 'entregar tarefa', 'como envio minha resposta',
      'onde respondo o questionário', 'ver minha nota da atividade', 'ver o gabarito', 'fazer a atividade que o professor passou',
      'onde faço o exercício da disciplina',
    ],
  },
  {
    id: 'gerar-mensalidades', titulo: 'Gerar as mensalidades do mês', entrada: 'finance-tuitions', permissao: 'finance.tuitions.gerar-lote',
    exemplos: [
      'gerar mensalidades', 'criar os boletos do mês', 'cobranças em lote', 'mensalidade do mês', 'lançar mensalidade dos alunos',
      'cobrar a mensalidade de todos os alunos', 'gerar a cobrança mensal',
    ],
  },
  {
    id: 'registrar-pagamento', titulo: 'Registrar o pagamento de uma cobrança', entrada: 'finance-charges', permissao: 'finance.charges.marcar-pago',
    exemplos: [
      'registrar pagamento', 'dar baixa em cobrança', 'o aluno pagou', 'marcar como pago', 'renegociar cobrança',
      'cancelar cobrança', 'nova cobrança avulsa', 'aluno pagou o boleto', 'registrar pagamento do boleto',
    ],
  },
  {
    id: 'cadastrar-patrimonio', titulo: 'Cadastrar um item de patrimônio', entrada: 'assets-inventory', permissao: 'assets.inventory.criar',
    exemplos: [
      'cadastrar patrimônio', 'novo equipamento', 'registrar computador no inventário', 'adicionar bem da instituição',
      'emprestar equipamento', 'mover equipamento de sala', 'mandar para manutenção', 'chegou equipamento novo',
      'registrar compra de equipamento',
    ],
  },
];

/**
 * Frases de exemplo de telas sem roteiro guiado, para distinguir dúvidas parecidas (por exemplo, o aluno que quer
 * ver as próprias notas e o professor que quer lançá-las).
 */
export const EXEMPLOS_ENTRADAS: Record<string, string[]> = {
  'link-esqueci-minha-senha-na-tela-de-login': ['esqueci minha senha', 'recuperar a senha', 'não lembro a senha', 'trocar minha senha'],
  'student-grades': ['ver minhas notas', 'minha média', 'consultar meu boletim', 'qual foi minha nota', 'tirei quanto na prova', 'minhas notas do semestre'],
  'student-attendance': ['ver minhas faltas', 'minha frequência', 'quantas faltas eu tenho'],
  'student-finance': ['baixar meu boleto', 'minhas mensalidades', 'quanto eu devo', 'pagar com pix', 'segunda via do boleto'],
  'student-documents': ['baixar plano de ensino', 'documentos da disciplina', 'regulamento acadêmico'],
  'student-calendar': ['calendário de provas', 'datas das provas', 'feriados do semestre'],
  'student-history': ['histórico escolar', 'coeficiente de rendimento', 'disciplinas cursadas'],
  'rooms-reservations': ['minhas reservas', 'cancelar minha reserva', 'situação da minha reserva', 'ver as reservas que solicitei', 'acompanhar meus pedidos de reserva'],
  'notifications-icone-de-sino-na-barra-superior': ['ver avisos', 'minhas notificações', 'marcar aviso como lido'],
  'icone-de-saida-na-barra-superior': ['sair do sistema', 'fazer logout', 'encerrar sessão'],
  'settings': ['tema escuro', 'modo noturno', 'mudar a aparência', 'testar envio de email'],
  'boost-portal-entrar': ['entrar no portal do boost', 'acessar cursos livres', 'login do portal de cursos'],
  'boost-portal-painel-matriculaid': ['assistir aula do curso', 'concluir aula', 'falar com orientador do curso', 'emitir certificado do curso'],
  'boost-portal-verificar': ['verificar certificado', 'conferir autenticidade do certificado'],
  'boost-manage-id': ['montar curso livre', 'criar módulos e aulas', 'enviar vídeo da aula', 'matricular aluno no curso livre'],
  'instalacao-do-sistema': ['instalar o sistema', 'como instalo o rooster one', 'iniciar o sistema com o windows'],
  'botao-do-assistente-no-canto-inferior-direito': [
    'como uso o assistente', 'como funciona o assistente de dúvidas', 'o que o assistente faz', 'como funciona o roteiro guiado',
    'como funciona o passo a passo na tela', 'para que serve o botão mostrar na tela', 'como usar o sistema',
    'quero ajuda para usar o sistema', 'o assistente consulta minhas notas', 'como encerrar o roteiro guiado',
  ],
};
