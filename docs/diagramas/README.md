# Diagramas — Rooster One

Conjunto de 52 diagramas gerados a partir do estado do sistema (schema Prisma, controllers, guards, catálogo de
permissões e rotas do frontend), e não de desenho prévio.

- **`src/`**: fonte Mermaid (`.mmd`) de cada diagrama. Constitui a fonte de verdade: toda alteração do sistema que
  afete um diagrama deve ser refletida aqui.
- **`png/`**: renderização de cada fonte, utilizada no documento `Rooster-One-Documentacao-Geral.docx`.

## Regeneração

Requer Node.js e Chrome ou Chromium instalado (o renderizador utiliza Puppeteer com o navegador local).

```bash
npm install @mermaid-js/mermaid-cli
# puppeteer-config.json com o caminho do executável do Chrome local:
# { "executablePath": "C:/Program Files/Google/Chrome/Application/chrome.exe", "args": ["--no-sandbox"] }
npx mmdc -i src/<nome>.mmd -o png/<nome>.png -p puppeteer-config.json -b white -s 3
```

Após a regeneração, a figura correspondente deve ser substituída no documento Word.

## Catálogo

| Categoria | Diagramas |
|---|---|
| Contexto e arquitetura | `contexto`, `arquitetura-geral`, `componentes`, `implantacao`, `dependencias-modulos`, `integracao-modulos`, `atores` |
| Modelo de dados (ERD) | `erd-geral`, `erd-hub`, `erd-desk`, `erd-rooms`, `erd-assets`, `erd-academy`, `erd-learn`, `erd-finance`, `erd-boost` |
| Segurança e autorização | `rbac-modelo`, `camadas-autorizacao`, `auth-dupla`, `camadas-permissao-front` |
| Casos de uso | `casos-uso-geral`, `casos-uso-hub`, `casos-uso-desk`, `casos-uso-academy`, `casos-uso-boost` |
| Sequência | `seq-login`, `seq-autorizacao`, `seq-permissao`, `seq-ticket`, `seq-reserva`, `seq-correcao-nota`, `seq-cobranca-lote`, `seq-certificado` |
| Atividade (processos) | `ativ-autenticacao`, `ativ-reserva`, `ativ-academico`, `ativ-financeiro`, `ativ-atividade`, `ativ-patrimonio` |
| Estados | `estado-ticket`, `estado-reserva`, `estado-patrimonio`, `estado-usuario`, `estado-matricula`, `estado-atividade`, `estado-entrega`, `estado-cobranca`, `estado-matricula-boost` |
| Navegação (frontend) | `mapa-navegacao` |

## Enquadramento em página

Cada figura deve caber em **uma** página A4, com o texto legível. O gerador do documento limita largura e altura
(620 × 860 px na área útil) e **emite aviso** quando a figura resulta com menos de 440 px de largura, indicação de
texto excessivamente reduzido.

Nesse caso, a correção deve ser feita **na fonte do diagrama, e nunca pela redução da figura**. Em ordem de eficácia:

1. **Redução de níveis verticais.** Um fluxo com 20 etapas em coluna única não cabe em página. As etapas devem ser
   agrupadas em nós de nível conceitual mais alto (o passo a passo pertence ao texto, e não à figura) ou divididas em
   duas figuras por fase, procedimento adotado nos processos financeiro e de atividade e entrega.
2. **Alargamento dos nós** com `%%{init: {'flowchart': {'wrappingWidth': 420}}}%%`. O padrão do Mermaid quebra
   rótulos longos em muitas linhas, o que torna os nós altos e o diagrama estreito; a ampliação da largura de quebra
   produz o efeito inverso.
3. **Redução de atributos nos diagramas ER.** Cada atributo aumenta a altura da caixa; devem constar a chave e os
   campos relevantes para a relação, pois o dicionário completo está em `database/02-entidades.md`.

**Procedimento ineficaz** (verificado): a substituição de `flowchart TD` por `LR` em fluxo linear longo apenas
converte excesso de altura em excesso de largura; o processo financeiro chegou a resultar 14 vezes mais largo que
alto, com texto ilegível.

## Convenções

- Rótulos sem acentuação nos diagramas, para evitar problemas de renderização em alguns ambientes; o texto
  explicativo, acentuado, consta do documento, e não da figura.
- Renderização com `-s 3` (resolução três vezes maior que a base), para manter a nitidez do texto quando o Word
  ajusta a figura à página.
- Os diagramas de estado e de sequência citam, quando aplicável, a regra de negócio (RN0XX) correspondente; ver
  `docs/system/04-regras-de-negocio.md`.
- Não foram produzidos diagramas de infraestrutura de produção, por inexistir ambiente de produção; a ausência é
  registrada no documento, em vez de ilustrada por desenho hipotético. O pipeline de integração contínua está
  descrito em texto em `docs/operations/05-cicd.md`.
- Revisão de 01/10/2026: `erd-geral` atualizado para representar o professor como orientador de curso do Boost
  (relação N:N por `CursoOrientadorBoost`), e não como instrutor responsável.
