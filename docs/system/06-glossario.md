# Glossário — Rooster One

| Termo | Significado no Rooster One |
|---|---|
| **Access token** | JWT assinado emitido no login e na renovação de sessão, com validade de 8 horas, enviado no cabeçalho `Authorization` de cada requisição. |
| **Administrador** | Usuário que possui a permissão `Rooster Hub` / `/hub/acessos` / `gerenciar-permissoes`; não constitui atributo nem papel. O sistema impede a ausência de administrador ativo. |
| **Ambiente** | Espaço físico reservável no Rooster Rooms (sala, laboratório, auditório etc.), vinculado a um bloco e a um campus. |
| **Anexo** | Arquivo enviado e vinculado a um chamado do Desk (`AnexoTicket`) ou a uma entrega do Learn (`AnexoEntrega`), gravado cifrado em disco. |
| **Assistente de dúvidas** | Recurso de ajuda ao usuário (`src/assistente/`) que responde a perguntas sobre o uso do sistema exclusivamente com o conteúdo do Manual do Usuário e dos guias, por motor de linguagem local, e indica o roteiro guiado das tarefas principais (RN051). |
| **Atendente** | Usuário do Hub vinculado a um setor, que pode ser designado técnico de um chamado do Desk. |
| **Auditoria** | Registro automático de eventos de segurança e de operações sensíveis (`LogAuditoria`), com o autor da ação, como login, alterações de usuários e permissões, redefinição de senha, notas e cobranças. Não se confunde com o histórico de entidade de negócio. |
| **Backend** | API REST em NestJS, Prisma e PostgreSQL (`RoosterOneBackend-main`). |
| **Base de conhecimento** | Conjunto de entradas do assistente de dúvidas (`src/assistente/base-conhecimento.ts`), gerado a partir do Manual do Usuário e dos guias por `npm run assistente:base`. |
| **BoostUsuario** | Conta de aluno externo do portal do Boost, com autenticação própria e sem relação com `Usuario` do Hub. |
| **Certificado** | Documento em PDF emitido automaticamente na conclusão de curso do Boost que emite certificado, com código de verificação pública. |
| **Chamado (ticket)** | Registro de solicitação de suporte no Rooster Desk, com protocolo, categoria, prioridade, status, conversa e histórico. |
| **Cifragem em repouso** | Gravação dos arquivos em disco na forma cifrada (AES-256-GCM para documentos e AES-256-CTR para vídeo), com a chave `FILE_ENCRYPTION_KEY`. |
| **Cobrança** | Entidade única do Rooster Finance (`Cobranca`) para mensalidade, produto, serviço ou taxa, sempre vinculada a um aluno do Academy. |
| **DTO** | Data Transfer Object: classe com decorators de `class-validator` que define e valida o formato de entrada de cada rota do backend. |
| **Frontend** | Aplicação TanStack Start e React, com renderização no servidor (`RoosterOneFrontEnd-main`). |
| **Guard** | Mecanismo do NestJS executado antes do controller; o Rooster One utiliza `ThrottlerGuard` (limitação de requisições), `JwtAuthGuard` (autenticação), `PermissionGuard` (autorização) e `BoostJwtAuthGuard` (autenticação do portal do Boost). |
| **Histórico** | Registro de alteração de campo de entidade de negócio, em `HistoricoTicket` (chamado) e `ReservaHistorico` (reserva), gravado somente quando o valor efetivamente muda. |
| **Item avaliativo** | Componente de avaliação de uma turma (`ItemAvaliativo`), com peso e nota máxima, criado manualmente ou pela publicação de atividade do Learn (`origem: 'learn'`). |
| **JWT** | JSON Web Token: token assinado utilizado como access token. |
| **Log de erro** | Registro automático de respostas com status igual ou superior a 500 (`LogErro`), com relatório no Hub. |
| **Módulo (Hub)** | Registro que agrupa permissões no banco (`Modulo`), como "Rooster Desk" ou "Rooster Rooms". Não se confunde com o módulo NestJS nem com a área de produto do frontend. |
| **Movimentação** | Registro de deslocamento ou mudança de estado de um patrimônio (`PatrimonioMovimento`), dos tipos setor, sala, empréstimo, devolução e manutenção. |
| **Orientador** | Professor do Academy vinculado a curso do Boost para a comunicação com os alunos, sem atribuição de gestão. |
| **Patrimônio** | Item de inventário controlado pelo Rooster Assets (equipamento, mobiliário etc.). |
| **Permissão** | Menor unidade de autorização do sistema, identificada por `módulo + recurso (rota da tela) + ação` e concedida diretamente ao usuário. |
| **Política de multa e juros** | Regra definida pela equipe financeira (`PoliticaMultaJuros`), com percentual de multa, juros diários e carência, vinculável a serviço ou a cobrança. |
| **RBAC** | Role-Based Access Control. No Rooster One, é aplicado diretamente por usuário: não há perfil ou papel como entidade, e cada usuário reúne as próprias permissões. |
| **Recurso** | No contexto de permissão, a rota da tela do frontend (por exemplo, `/desk/tickets`) que integra a chave da permissão. |
| **Refresh token** | Token de longa duração (30 dias), armazenado no servidor apenas como hash, utilizado para obter novo access token sem nova autenticação; rotacionado a cada uso e revogado no logout, na troca de senha e na desativação do usuário. |
| **Reserva** | Solicitação de uso de um ambiente em data e horário determinados, no Rooster Rooms, que pode integrar uma série recorrente. |
| **Roteiro guiado** | Condução passo a passo de uma tarefa na própria interface, com a tela escurecida, o elemento do passo em destaque e legenda com a instrução e a finalidade do campo; oferecido apenas a quem possui a permissão da tarefa (RN052). |
| **Série (de reservas)** | Conjunto de reservas recorrentes (diárias, semanais ou mensais) geradas em conjunto e vinculadas por `serieId`, passíveis de cancelamento em bloco. |
| **Sessão (`Sessao`)** | Registro de sessão de refresh token, criado no login e revogado na renovação, no logout, na troca de senha e na desativação do usuário. |
| **Setor** | Unidade organizacional (por exemplo, "Suporte de TI") utilizada para vincular usuários e restringir a visibilidade de chamados e categorias por equipe. |
| **SLA** | Service Level Agreement: prazo de atendimento de categoria ou subcategoria de chamado, em horas (`slaHoras`, padrão de 8 horas), calculado no frontend a partir de `criadoEm`, sem persistência por chamado. |
| **Token de redefinição de senha** | Valor aleatório de uso único, armazenado como hash SHA-256, com validade de 1 hora, utilizado na recuperação de senha. |
| **Token de transmissão** | Token de 5 minutos, restrito a uma aula, que autoriza a reprodução de vídeo hospedado do Boost. |
| **Turma** | Oferta efetiva de uma disciplina em um período letivo (`Turma`), com professor, turno, sala, horário e capacidade. |
