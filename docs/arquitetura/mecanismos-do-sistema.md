# Mecanismos do Sistema

## Visão geral

Esta página reúne os mecanismos implementados ou planejados para o backend do Rooster One, com foco em segurança, organização, observabilidade e evolução da plataforma.

## Autenticação

### Status atual
- Estrutura de usuários, sessões e refresh token já modelada.
- Implementação completa de autenticação JWT ainda não está presente.

### Planejamento
- integrar autenticação baseada em JWT;
- proteger endpoints sensíveis;
- implementar refresh token rotativo.

## Autorização e RBAC

### Status atual
- perfis, módulos e permissões já foram modelados.
- a base para autorização está estruturada, mas ainda precisa de aplicação explícita nos endpoints.

### Planejamento
- implementar RBAC fino por recurso e ação;
- avaliar acesso por perfil, usuário e contexto.

## Auditoria

### Status atual
- o modelo de logs de auditoria está presente.
- os registros podem ser usados como base para rastreabilidade futura.

### Planejamento
- registrar automaticamente ações sensíveis;
- incluir metadados adicionais como IP, navegador e entidade afetada.

## Notificações

### Status atual
- há modelo de notificações com título, mensagem e status de leitura.

### Planejamento
- integrar notificações com canal de e-mail ou push;
- adicionar prioridade e categoria.

## Sessões

### Status atual
- modelo de sessões presente com controle de expiração e revogação.

### Planejamento
- gerenciar logout global;
- reforçar segurança com token rotativo e revogação em lote.

## Uploads

### Status atual
- não implementado.

### Planejamento
- criar módulo dedicado para arquivos;
- definir armazenamento, validação e regras de segurança.

## Paginação e filtros

### Status atual
- não implementado de forma centralizada.

### Planejamento
- padronizar paginação e filtros para listagens;
- permitir ordenação e busca por campos relevantes.

## Cache

### Status atual
- não implementado.

### Planejamento
- aplicar cache em consultas de leitura frequentes;
- definir políticas de invalidação.

## Logs e observabilidade

### Status atual
- estrutura de logs de auditoria presente.

### Planejamento
- integrar logging de aplicação;
- separar logs de negócio, erro e auditoria.

## Validações e exceções

### Status atual
- validações via DTOs e `ValidationPipe` estão implementadas.
- exceções básicas como `NotFoundException` já são utilizadas.

### Planejamento
- centralizar exceções customizadas;
- padronizar resposta de erro.

## Organização dos módulos

### Status atual
- arquitetura modular por domínio já está adotada.

### Planejamento
- manter o padrão ao criar novos módulos;
- evitar acoplamento entre domínios.
