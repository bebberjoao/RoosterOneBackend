# Auditoria da Documentação — Rooster One

Registro das auditorias da documentação técnica dos dois repositórios (`RoosterOneBackend-main` e
`RoosterOneFrontEnd-main`): cobertura, método, inconsistências identificadas e política de manutenção.

## Revisão de 30/09 a 01/10/2026

### Escopo

Revisão integral de todos os documentos dos dois repositórios, com dois objetivos:

1. **Conformidade com o código**: cada afirmação foi confrontada com o código-fonte, o schema e os scripts
   vigentes; as afirmações desatualizadas foram corrigidas, e as lacunas, preenchidas.
2. **Registro técnico-formal**: todo o texto foi reescrito em linguagem técnica e impessoal, com a eliminação de
   coloquialismos, de construções em primeira pessoa e de expressões informais. Como apoio, utilizou-se um detector
   de marcadores de informalidade aplicado a todos os arquivos `.md`, seguido de leitura integral dos documentos.

### Cobertura

| Área | Local | Documentos |
|---|---|---|
| Sistema | `RoosterOneBackend-main/docs/system/` | 6 |
| Frontend | `RoosterOneFrontEnd-main/docs/frontend/` | 11 |
| Backend | `RoosterOneBackend-main/docs/backend/` | 13 |
| API | `RoosterOneBackend-main/docs/api/` | 5 |
| Banco de dados | `RoosterOneBackend-main/docs/database/` | 6 |
| Segurança | `RoosterOneBackend-main/docs/security/` | 6 |
| Engenharia | `RoosterOneBackend-main/docs/engineering/` | 14 |
| Operações | `RoosterOneBackend-main/docs/operations/` | 8 |
| Guias | `RoosterOneBackend-main/docs/user-guides/` | 2 |
| Diagramas | `RoosterOneBackend-main/docs/diagramas/` | 1 (com fontes Mermaid e imagens) |

Além desses, foram revisados os arquivos `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, os modelos de issue e de
pull request (`.github/`) e os índices `docs/README.md` dos dois repositórios, bem como o Manual do Usuário e a
Documentação Geral em formato Word.

### Inconsistências corrigidas na documentação

Entre as afirmações que não correspondiam mais ao código, destacam-se:

- arquitetura descrita com apenas quatro módulos (Hub, Desk, Rooms e Assets), quando o sistema possui nove;
- ausência de renovação de sessão, quando o refresh token com rotação está implementado;
- CORS restrito a `localhost` e com o cabeçalho `x-user-id`, quando o critério atual considera as origens
  configuradas e o cabeçalho foi removido;
- inexistência de filtro global de exceções e de log em JSON, ambos implementados;
- ordem de execução incorreta entre `ValidationPipe` e guards (os guards são executados antes dos pipes);
- diagrama ER sem o módulo Finance e com o modelo anterior do Boost (professor responsável pelo curso e mensagens
  vinculadas ao curso);
- matriz de rastreabilidade restrita a quatro módulos (45 requisitos ausentes);
- catálogo de índices e restrições sem os módulos Boost e Finance e sem os índices recentes de `Reserva` e
  `LogErro`;
- seed descrito com 132 permissões e sem arquivos de demonstração, quando o script atual cria 141 permissões e PDFs
  cifrados;
- endpoints omitidos da referência da API (verificação pública de certificado e download de material pelo aluno);
- tamanho mínimo de senha divergente entre documentos (6 e 8 caracteres; o valor vigente é 8).

### Defeitos de código identificados durante a revisão

A confrontação da documentação com o código revelou dois defeitos, corrigidos em 01/10/2026 e registrados em
`docs/engineering/08-divida-tecnica.md` e no `CHANGELOG.md`:

- violação de unicidade respondida como erro interno (`500`) em doze services, em contradição com a documentação,
  que previa `409`;
- auditoria do Hub com o usuário afetado registrado como autor da ação.

### Pendências

- Os diagramas Mermaid foram construídos a partir da leitura do código; as imagens em `docs/diagramas/png/` devem
  ser regeneradas sempre que as fontes forem alteradas (ver `docs/diagramas/README.md`).
- A referência de endpoints (`docs/api/02-endpoints.md`) deve ser confrontada com o Swagger (`/api/docs`) antes de
  sua utilização como contrato para nova integração externa.

## Auditoria inicial (setembro de 2026)

A primeira reconstrução integral da documentação, realizada em setembro de 2026, produziu 65 documentos e abrangia,
à época, os quatro módulos então implementados (Hub, Desk, Rooms e Assets). As pendências registradas naquela
auditoria e a situação de cada uma estão resumidas a seguir.

| Pendência registrada em setembro de 2026 | Situação em 01/10/2026 |
|---|---|
| Ausência de integração contínua, Docker e configuração de implantação | Resolvida: CI no GitHub Actions nos dois repositórios, `Dockerfile` e `docker-compose.yml` (`docs/operations/04-deploy.md` e `05-cicd.md`) |
| Ausência de rotina de backup | Resolvida: scripts de backup, restauração e simulado de recuperação (`docs/operations/06-backup-e-recuperacao.md`); o agendamento depende do ambiente de produção |
| Ausência de testes de frontend e de testes unitários de backend | Resolvida: 81 testes de frontend, 137 testes unitários e 85 testes e2e no backend (`docs/engineering/14-estrategia-de-testes.md`) |
| Ausência de limitação de requisições | Resolvida: `ThrottlerGuard` global e limites por rota |
| Validação de upload restrita ao tamanho | Resolvida: lista de mimetypes e verificação de assinatura binária, com gravação cifrada |
| Ausência de `.env.example` | Resolvida nos dois repositórios |
| Exposição de `senhaHash` nas respostas de usuário | Resolvida: seleção explícita dos campos (`USUARIO_SAFE_SELECT`) |
| Senha mínima inconsistente (6 e 8 caracteres) | Resolvida: mínimo unificado em 8, com teste de regressão |
| Bibliotecas instaladas sem uso (`react-hook-form`, `zod`) | Resolvida: removidas |
| Tabela `Sessao` sem uso | Resolvida: utilizada pelo refresh token |
| Cabeçalho `x-user-id` no CORS | Resolvido: removido |
| Acoplamento entre o seletor de perfil de demonstração e a permissão real | Resolvido: seletor removido; a interface utiliza as permissões efetivas |
| Dependências com vulnerabilidade conhecida (11 avisos) | Parcialmente resolvida: as vulnerabilidades exploráveis por requisição HTTP foram corrigidas; permanecem avisos em `deepmerge-ts` (CLI do Prisma) e `js-yaml` (Swagger), classificados como risco aceito por processarem apenas entrada confiável (`docs/security/05-analise-de-seguranca.md`) |
| Motivação histórica de NestJS, Prisma, organização modular, ausência de repositório e TanStack Start | Permanece não documentada, por ausência de registro (`docs/engineering/03-decisoes-arquiteturais.md`) |

## Política de manutenção

A documentação integra a tarefa de desenvolvimento, e não constitui etapa opcional:

```
Código alterado → Testes → Análise de impacto na documentação → Documentação atualizada → Validação → Tarefa concluída
```

Ao alterar o sistema, devem ser identificadas as áreas afetadas e atualizados os documentos correspondentes:
`system/`, `frontend/`, `backend/`, `api/`, `database/`, `security/`, `engineering/`, `operations/` e
`user-guides/`. Alteração de schema ou migration exige revisão de `database/` e de
`engineering/07-rastreabilidade.md`; alteração de permissão ou RBAC, revisão de `security/` e do lado afetado
(`backend/10-autorizacao-rbac.md` e/ou `frontend/08-autorizacao.md`); alteração de endpoint, revisão de
`api/02-endpoints.md`. Toda documentação deve ser redigida em registro técnico-formal, em terceira pessoa e sem
coloquialismos.
