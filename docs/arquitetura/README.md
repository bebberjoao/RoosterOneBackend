# Arquitetura do Backend

## Visão geral

O backend do Rooster One é uma API REST modular construída com NestJS, organizada em domínios do negócio. A proposta é manter cada módulo com responsabilidade própria, facilitando manutenção, testes e evolução.

## Estrutura principal

```text
src/
├── app.module.ts
├── main.ts
└── roster-hub/
    ├── roster-hub.module.ts
    ├── shared/
    ├── usuarios/
    ├── setores/
    ├── perfis/
    ├── modulos/
    ├── permissoes/
    ├── usuarios-perfis/
    ├── usuarios-setores/
    ├── perfis-permissoes/
    ├── notificacoes/
    ├── sessoes/
    └── logs-auditoria/
```

## Responsabilidades por camada

### Controllers

Os controllers recebem as requisições HTTP, delegam a execução para o service e tratam os retornos básicos. Eles não devem concentrar regra de negócio.

### Services

Os services implementam a lógica de negócio e coordenam as operações com o Prisma. Esta camada é o núcleo do comportamento do módulo.

### DTOs

Os DTOs definem a forma esperada dos dados recebidos pelas rotas e são usados para validação. A aplicação já utiliza `ValidationPipe` global com:

- `whitelist: true`;
- `forbidNonWhitelisted: true`;
- `transform: true`.

### Prisma

O Prisma atua como camada de persistência e abstração do banco de dados. O modelo é centralizado em [prisma/schema.prisma](../prisma/schema.prisma).

## Padrões adotados

| Padrão | Descrição |
| --- | --- |
| Modularização | Cada domínio tem seu próprio módulo |
| CRUD base | Controllers e services seguem estrutura semelhante |
| DTOs | Validação e transferência de dados centralizadas |
| Serviços | Regras de negócio concentradas na camada de serviço |
| Prisma | Acesso ao banco centralizado em um único cliente |

## Organização dos módulos

Cada módulo segue uma estrutura semelhante:

```text
<modulo>/
├── <modulo>.controller.ts
├── <modulo>.service.ts
├── <modulo>.module.ts
└── dto/
    ├── create-<modulo>.dto.ts
    └── update-<modulo>.dto.ts
```

## Tratamento de exceções

Atualmente, a API utiliza exceções do NestJS como `NotFoundException` para cenários de recurso inexistente. Como evolução, recomenda-se:

- criar uma camada de exceções customizadas;
- padronizar mensagens de erro;
- centralizar logs e retorno de erro estrutural.

## Validações

As validações são aplicadas em duas frentes:

1. validação estrutural via DTOs;
2. validação de regras de negócio no service.

## Mecanismos do Sistema

Consulte a página dedicada em [mecanismos-do-sistema.md](mecanismos-do-sistema.md) para detalhes sobre autenticação, autorização, auditoria, sessões, uploads, logs e outros mecanismos.

| Mecanismo | Status | Observação |
| --- | --- | --- |
| Validação de DTOs | Implementado | Com `class-validator` e `ValidationPipe` |
| CRUD base | Implementado | Padrão consistente para todos os módulos |
| Controle de permissões | Estruturado | Base via perfis e módulos |
| Auditoria | Implementado em estrutura | Logs de auditoria disponíveis |
| Sessões | Estruturado | Modelo de sessão e refresh token presente |
| Autenticação JWT | Planejado | Não implementado ainda |
| RBAC fino | Planejado | Base para evolução |
| Uploads | Planejado | Não implementado |
| Paginação e filtros | Planejado | Requer evolução da camada de consulta |
| Cache | Planejado | Não implementado |

## Recomendações futuras

- criar módulos de autenticação e autorização explícitos;
- introduzir middleware para auditoria transversal;
- padronizar respostas de sucesso e erro;
- implementar testes unitários e de integração;
- centralizar logs com biblioteca de observabilidade.
