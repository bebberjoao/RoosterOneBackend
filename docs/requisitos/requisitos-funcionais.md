# Requisitos Funcionais — Rooster One

Cobre os quatro módulos com backend real: **Rooster Hub**, **Rooster Desk**,
**Rooster Rooms** e **Rooster Assets**. Academy, Learn, Finance, Boost e
Student têm tela pronta no frontend mas nenhum requisito aqui, porque não
têm backend (ver `docs/contrato-frontend.md`).

Formato de cada requisito: descrição, ator, pré-condição, fluxo principal,
pós-condição e o(s) endpoint(s) que o implementam. Status "Implementado"
significa que existe endpoint real, RBAC checado no servidor e (quando
aplicável) tela ligada a ele — não é intenção documentada, é o que roda hoje.

## Rooster Hub

### RF001 — Autenticar usuário
- **Descrição**: um usuário cadastrado e ativo entra no sistema com e-mail e senha, recebendo um token de sessão.
- **Ator**: qualquer usuário cadastrado.
- **Pré-condição**: usuário existe, está ativo e a senha informada confere com o hash salvo.
- **Fluxo principal**: usuário envia e-mail/senha → sistema valida (bcrypt) → sistema emite JWT (expira em 8h) → sistema devolve usuário, permissões efetivas e o token.
- **Pós-condição**: token válido para as próximas 8h; `ultimoLogin` do usuário atualizado.
- **Endpoint**: `POST /auth/login`. **Status**: Implementado.

### RF002 — Gerenciar usuários
- **Descrição**: criar, listar, consultar, editar e excluir usuários da instituição.
- **Ator**: usuário com permissão `/hub/usuarios` (criar/editar/excluir/acessar).
- **Pré-condição**: usuário autenticado com a permissão correspondente à ação.
- **Fluxo principal**: requisição autenticada → `PermissionGuard` valida `/hub/usuarios:<ação>` → serviço aplica a operação (senha é hasheada em criação/edição).
- **Pós-condição**: usuário persistido/atualizado/removido.
- **Endpoints**: `POST/GET/PATCH/DELETE /usuarios`. **Status**: Implementado.

### RF003 — Gerenciar setores
- **Descrição**: cadastrar os setores/unidades organizacionais da instituição.
- **Ator**: usuário com permissão `/hub/setores`.
- **Fluxo principal**: CRUD padrão de setor.
- **Endpoints**: `POST/GET/PATCH/DELETE /setores`. **Status**: Implementado.

### RF004 — Gerenciar usuários de um setor
- **Descrição**: vincular/desvincular usuários a um setor (setor é organização, não concede permissão nenhuma por si só).
- **Ator**: usuário com permissão `/hub/setores:gerenciar-usuarios`.
- **Fluxo principal**: tela "Usuários do setor" lista candidatos, marca/desmarca, salva em lote.
- **Endpoints**: `POST/GET/DELETE /usuarios-setores`. **Status**: Implementado.

### RF005 — Conceder e revogar permissões
- **Descrição**: dar ou tirar de um usuário uma permissão individual (`módulo.tela.ação`), sem Perfil/Role intermediário.
- **Ator**: usuário com permissão `/hub/acessos:conceder` / `:revogar`.
- **Pré-condição**: a permissão já existe (ou é criada sob demanda pela própria tela) e o usuário alvo existe.
- **Fluxo principal**: tela Usuário → Módulo → Tela → Ação → marca a operação → grava em `usuarios_permissoes`.
- **Pós-condição**: a permissão concedida passa a valer na próxima requisição do usuário (checada por `PermissionGuard`, não só escondida na UI).
- **Endpoints**: `POST/GET/DELETE /usuarios-permissoes`, `POST/GET/PATCH/DELETE /permissoes`. **Status**: Implementado.

### RF006 — Consultar acesso efetivo de um usuário
- **Descrição**: ver todas as permissões que um usuário tem, e verificar uma permissão específica.
- **Ator**: usuário com permissão `/hub/usuarios:acessar`.
- **Endpoints**: `GET /usuarios/:id/acesso`, `GET /usuarios/:id/acesso/verificar`. **Status**: Implementado.

### RF007 — Auditoria e sessões
- **Descrição**: registrar e consultar logs de auditoria e sessões ativas.
- **Ator**: usuário com permissão `/hub/acessos:gerenciar-permissoes` (tratado como operação administrativa).
- **Endpoints**: `POST/GET/PATCH/DELETE /logs-auditoria`, `/sessoes`. **Status**: Implementado (CRUD manual; sem captura automática de eventos ainda — ver RNF de auditoria).

### RF008 — Notificações
- **Descrição**: registrar e consultar notificações internas de um usuário.
- **Ator**: qualquer usuário autenticado (leitura); administração (criação/gerência).
- **Endpoints**: `POST/GET/PATCH/DELETE /notificacoes`. **Status**: Implementado (sem gatilho automático ligado às ações de outros módulos, além do aviso de nova mensagem no Desk — RF017).

## Rooster Desk

### RF009 — Abrir chamado
- **Descrição**: um usuário relata um problema/solicitação, escolhendo categoria, subcategoria e prioridade.
- **Ator**: usuário com permissão `/desk/tickets:criar`.
- **Pré-condição**: categoria e (se informada) subcategoria existem e são compatíveis entre si.
- **Fluxo principal**: usuário preenche o formulário → sistema valida classificação → sistema cria o chamado com status inicial "Aberto", protocolo sequencial (`TCK-000n`) e o solicitante é o usuário autenticado (nunca o que vier no corpo).
- **Pós-condição**: chamado criado, visível para o solicitante e para quem atende o setor da categoria.
- **Endpoint**: `POST /chamados`. **Status**: Implementado.

### RF010 — Acompanhar e filtrar chamados
- **Descrição**: listar os chamados visíveis ao usuário (os próprios, ou os do(s) setor(es) que atende), com filtro por categoria/status/prioridade/busca textual.
- **Ator**: usuário com permissão `/desk/tickets:acessar`.
- **Endpoint**: `GET /chamados`, `GET /chamados/:id`. **Status**: Implementado.

### RF011 — Alterar status do chamado (resolver, reabrir, encerrar)
- **Descrição**: mudar o status de um chamado; o solicitante não pode alterar o status do próprio chamado (evita "aprovar a si mesmo").
- **Ator**: usuário com a permissão específica da transição: `/desk/tickets:encerrar` (fechar), `:reabrir` (reabrir um encerrado), `:editar` (demais transições).
- **Pré-condição**: quem aciona não é o solicitante do chamado (a menos que seja administrador).
- **Fluxo principal**: sistema identifica a transição pelo campo `encerrado` do status atual/novo → escolhe a ação exigida → grava a mudança e um registro em `historico_tickets` (campo `status`, valor antigo/novo).
- **Endpoints**: `PATCH /chamados/:id`, `PATCH /chamados/:id/status`. **Status**: Implementado.

### RF012 — Transferir chamado
- **Descrição**: atribuir um técnico responsável pelo chamado.
- **Ator**: usuário com permissão `/desk/tickets:transferir`.
- **Pré-condição**: o técnico escolhido pertence ao mesmo setor do chamado.
- **Fluxo principal**: seleciona o técnico na tela do chamado → sistema confirma o vínculo de setor → grava `tecnicoId` e um registro em `historico_tickets` (campo `tecnico`).
- **Endpoint**: `PATCH /chamados/:id/atribuir`. **Status**: Implementado.

### RF013 — Conversar no chamado (pública e nota interna)
- **Descrição**: solicitante e equipe trocam mensagens no chamado; notas internas só são visíveis para quem atende.
- **Ator**: solicitante (só mensagem pública) ou atendente/administrador (pública ou interna, com permissão `/desk/tickets:nota-interna`).
- **Fluxo principal**: envia mensagem → sistema grava, registra em `historico_tickets` (campo `mensagem`) e notifica o outro lado (WebSocket + `notificacoes`).
- **Endpoints**: `GET/POST /chamados/:id/mensagens`. **Status**: Implementado.

### RF014 — Gerenciar categorias e subcategorias
- **Descrição**: cadastrar categorias de chamado (com setor responsável e SLA) e suas subcategorias.
- **Ator**: usuário com permissão `/desk/categories`; a categoria/subcategoria só pode ser gerida por quem é do mesmo setor (ou administrador).
- **Endpoints**: `POST/GET/PATCH/DELETE /chamados-categorias`, `/chamados-subcategorias`. **Status**: Implementado.

### RF015 — Vincular atendente a subcategoria
- **Descrição**: definir quais atendentes atendem cada subcategoria.
- **Ator**: usuário com permissão `/desk/team:vincular-categoria`, restrito ao próprio setor.
- **Endpoint**: `PATCH /chamados-subcategorias/:id/atendentes`. **Status**: Implementado.

### RF016 — Etiquetas e favoritos do chamado
- **Descrição**: marcar um chamado com etiquetas livres e como favorito.
- **Ator**: quem pode editar o chamado.
- **Endpoints**: `POST/PATCH /chamados` (campos `tags`, `favorito`). **Status**: Implementado.

### RF017 — Notificar sobre nova mensagem
- **Descrição**: ao receber uma mensagem, a outra parte do chamado é notificada.
- **Fluxo principal**: mensagem criada → sistema identifica o destinatário (quem não escreveu) → cria notificação e emite evento em tempo real (WebSocket, gateway `/desk`).
- **Status**: Implementado.

## Rooster Rooms

### RF018 — Cadastrar estrutura física (campus, bloco, ambiente)
- **Descrição**: cadastrar os campi, blocos e ambientes reserváveis, com capacidade, tipo, horário e dias de funcionamento e recursos disponíveis (projetor, som...).
- **Ator**: usuário com permissão `/rooms/structure`.
- **Endpoints**: `POST/GET/PATCH/DELETE /campus`, `/blocos`, `/ambientes`. **Status**: Implementado.

### RF019 — Solicitar reserva de ambiente
- **Descrição**: solicitar o uso de um ambiente em uma data/horário, informando finalidade e número de participantes.
- **Ator**: usuário com permissão `/rooms/book:solicitar`.
- **Pré-condição**: horário dentro da janela de funcionamento do ambiente, dentro da capacidade, e sem conflito com outra reserva ativa (análise/confirmada/andamento) do mesmo ambiente.
- **Fluxo principal**: usuário escolhe ambiente/data/horário → sistema valida disponibilidade → cria a reserva com status "análise" e `responsavelId` = usuário autenticado.
- **Pós-condição**: reserva visível para o solicitante e para quem gerencia reservas.
- **Endpoint**: `POST /reservas`. **Status**: Implementado.

### RF020 — Consultar disponibilidade do ambiente
- **Descrição**: ver os horários livres de um ambiente numa data, considerando a janela de funcionamento e reservas já ativas.
- **Endpoint**: `GET /ambientes/:id/disponibilidade`. **Status**: Implementado.

### RF021 — Aprovar, recusar ou cancelar reserva
- **Descrição**: a equipe decide sobre uma reserva em análise; uma reserva confirmada pode ser cancelada (com motivo).
- **Ator**: usuário com permissão `/rooms/manage:aprovar` (decisão) ou o próprio solicitante com `/rooms/reservations:cancelar` (cancelamento da própria).
- **Fluxo principal**: ao confirmar, revalida a disponibilidade (pode ter havido outra confirmação nesse meio-tempo) → grava `decididoPor`/`decididoEm` → registra em `reservas_historico` (campo `status`); ao cancelar, grava o motivo em `motivoCancelamento`.
- **Endpoint**: `PATCH /reservas/:id/status`. **Status**: Implementado.

### RF022 — Alterar horário da reserva
- **Descrição**: mudar data/horário de uma reserva (pelo solicitante, dentro do que já está cadastrado para a sala, ou pela equipe).
- **Ator**: solicitante com `/rooms/reservations:alterar-horario` (sobre a própria) ou equipe com `/rooms/manage:alterar-horario`.
- **Fluxo principal**: revalida disponibilidade no novo horário → atualiza a reserva → registra em `reservas_historico` (campo `horario`) quando o horário de fato muda.
- **Endpoint**: `PATCH /reservas/:id`. **Status**: Implementado.

### RF023 — Conversar sobre a reserva
- **Descrição**: solicitante e equipe trocam mensagens sobre a reserva (dúvidas, ajustes).
- **Ator**: o solicitante (`/rooms/reservations:mensagem`) ou quem gerencia (`/rooms/manage:responder`).
- **Endpoints**: `GET/POST /reservas/:id/mensagens`. **Status**: Implementado.

## Rooster Assets

### RF024 — Cadastrar patrimônio
- **Descrição**: registrar um bem (nome, tag única, categoria, marca/modelo/série, localização, setor, responsável, valor, condição).
- **Ator**: usuário com permissão `/assets/inventory:criar`.
- **Pré-condição**: tag de patrimônio é única no sistema.
- **Endpoint**: `POST /patrimonio`. **Status**: Implementado.

### RF025 — Consultar e editar patrimônio
- **Descrição**: listar/filtrar por categoria, setor, status; editar dados do item.
- **Endpoints**: `GET /patrimonio`, `PATCH /patrimonio/:id`. **Status**: Implementado.

### RF026 — Dar baixa em patrimônio
- **Descrição**: encerrar a vida útil de um item (status "baixado"), com motivo.
- **Ator**: usuário com permissão `/assets/inventory:editar`.
- **Endpoint**: `PATCH /patrimonio/:id/baixa`. **Status**: Implementado.

### RF027 — Registrar movimentação de patrimônio
- **Descrição**: mudança de setor, sala, empréstimo, devolução ou envio para manutenção; atualiza o item e registra o histórico na mesma transação.
- **Ator**: usuário com permissão `/assets/inventory:movimentar`.
- **Pré-condição**: item não está baixado; movimentações que definem um destino (setor/sala/empréstimo) exigem o campo preenchido.
- **Endpoint**: `POST /patrimonio-movimentacoes`. **Status**: Implementado.

### RF028 — Gerenciar categorias e setores de patrimônio
- **Descrição**: cadastrar as categorias (com cor) e setores usados para classificar o patrimônio.
- **Ator**: usuário com permissão `/assets/inventory:gerenciar-categorias`.
- **Endpoints**: `POST/GET/PATCH/DELETE /patrimonio-categorias`, `/patrimonio-setores`. **Status**: Implementado.
