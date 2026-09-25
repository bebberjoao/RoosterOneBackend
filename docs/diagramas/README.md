# Diagramas — Rooster One

52 diagramas gerados a partir do estado real do sistema (schema Prisma, controllers, guards, catálogo de permissões e rotas do frontend), não de um desenho prévio.

- **`src/`** — fonte Mermaid (`.mmd`) de cada diagrama. É a fonte de verdade: alterou o sistema, altere aqui.
- **`png/`** — renderização de cada fonte, usada no documento `Rooster-One-Documentacao-Geral.docx`.

## Como regerar

Requer Node e um Chrome/Chromium instalado (o renderizador usa Puppeteer apontando para o navegador local).

```bash
npm install @mermaid-js/mermaid-cli
# puppeteer-config.json apontando para o executável do Chrome local:
# { "executablePath": "C:/Program Files/Google/Chrome/Application/chrome.exe", "args": ["--no-sandbox"] }
npx mmdc -i src/<nome>.mmd -o png/<nome>.png -p puppeteer-config.json -b white -s 2
```

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

Cada figura precisa caber em **uma** página A4 com o texto ainda legível. O gerador do documento limita largura e altura (620 × 860 px na área útil) e **avisa** quando uma figura fica abaixo de 440 px de largura — sinal de que o texto ficou pequeno demais.

Quando isso acontecer, a correção é **na fonte do diagrama, nunca encolhendo a figura**. Em ordem de eficácia:

1. **Reduzir níveis verticais.** Um fluxo com 20 passos em coluna única não cabe em página nenhuma. Agrupe passos em nós de conceito mais alto (o passo a passo detalhado pertence à prosa, não à figura) ou divida em duas figuras de fases — foi o que se fez com o processo financeiro e o de atividade/entrega.
2. **Alargar os nós** com `%%{init: {'flowchart': {'wrappingWidth': 420}}}%%`. O padrão do Mermaid quebra rótulos longos em muitas linhas, o que deixa os nós altos e o diagrama estreito; aumentar a largura de quebra faz o oposto.
3. **Enxugar atributos nos ERDs.** Cada atributo listado aumenta a altura da caixa. Mostre a chave e os campos que importam para a relação; o dicionário completo está em `database/02-entidades.md`.

**O que não funciona** (testado): trocar `flowchart TD` por `LR` num fluxo linear longo apenas troca "alto demais" por "largo demais" — o processo financeiro chegou a ficar 14× mais largo que alto, com o texto ilegível.

## Convenções

- Sem acento nos rótulos dentro dos diagramas (evita problema de renderização em alguns ambientes); o texto explicativo com acentuação fica no documento, não na figura.
- Renderização em `-s 3` (3× a resolução base), para o texto continuar nítido quando o Word ajusta a figura à página.
- Cada diagrama de estado e de sequência cita, quando aplicável, a regra de negócio (RN0XX) que o governa — ver `docs/system/04-regras-de-negocio.md`.
- Onde o sistema não tem implementação (infraestrutura de produção, CI/CD), **nenhum diagrama foi produzido** — a ausência está registrada no documento em vez de ilustrada com um desenho hipotético.
