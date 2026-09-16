# Wiki Técnica do Backend - Rooster One

Esta pasta centraliza a documentação técnica do backend do projeto Rooster One, com foco em desenvolvedores e manutenção do sistema.

## Objetivo

Servir como uma wiki interna para compreender rapidamente:

- a arquitetura do backend;
- a organização dos módulos;
- as regras de negócio;
- os fluxos do sistema;
- a modelagem do banco de dados;
- os padrões de desenvolvimento e revisão.

## Índice geral

### Visão geral
- [Visão geral do sistema](SISTEMA.md)

### Arquitetura
- [Arquitetura do backend](arquitetura/README.md)
- [Mecanismos do sistema](arquitetura/mecanismos-do-sistema.md)

### Banco de dados
- [Modelagem e convenções](banco/README.md)

### Módulos
- [Módulos do sistema](modulos/README.md)

### Requisitos
- [Requisitos funcionais e não funcionais](requisitos/README.md)

### Regras de negócio
- [Regras de negócio](regras-negocio/README.md)

### Fluxos
- [Fluxos principais](fluxos/README.md)

### Decisões arquiteturais
- [ADRs](adr/README.md)

### Checklists
- [Checklists de desenvolvimento](checklist/README.md)

### Testes
- [Testes e2e do backend](testes-e2e.md)

### Registro de mudanças
- [CHANGELOG](CHANGELOG.md)

## Integração atual

- Hub, Desk, Rooms e Assets usam a API REST real em `http://localhost:3000`.
- O frontend deve definir `VITE_API_URL=http://localhost:3000`.
- Rooms e Assets já têm regras de negócio (reservas, movimentação de patrimônio)
  — ver [CHANGELOG](CHANGELOG.md).
- O Desk persiste SLA em `categorias_tickets.sla_horas` e
	`subcategorias_tickets.sla_horas`, padrão de 8 horas e mínimo de 1.
- O Hub mantém módulos, permissões e concessões diretas por usuário
  (`usuarios_permissoes`, sem Perfil) com índices únicos.
- O acesso efetivo pode ser consultado por `/usuarios/:id/acesso`.
- `JwtAuthGuard` (autenticação) e `PermissionGuard` (autorização por
  `@RequirePermission`) estão registrados globalmente — ver [rbac.md](rbac.md).

Após configurar o banco, aplique as migrations com:

```bash
npm run prisma:deploy
```

## Panorama do projeto

O backend do Rooster One está organizado como uma API REST modular construída com NestJS e Prisma, com foco em:

- gestão de usuários, setores e permissões (concedidas direto ao usuário);
- controle de sessões e notificações;
- auditoria de ações realizadas no sistema;
- extensibilidade para novos módulos e regras de negócio.

## Estrutura de navegação

```text
docs/
├── README.md
├── SISTEMA.md
├── arquitetura/
├── banco/
├── modulos/
├── requisitos/
├── regras-negocio/
├── fluxos/
├── adr/
└── checklist/
```

## Leitura recomendada

1. Comece por [SISTEMA.md](SISTEMA.md) para entender o contexto do projeto.
2. Consulte [arquitetura/README.md](arquitetura/README.md) para compreender a estrutura técnica.
3. Acesse [banco/README.md](banco/README.md) para entender a modelagem.
4. Use os módulos, regras e fluxos para implementar ou evoluir funcionalidades.
