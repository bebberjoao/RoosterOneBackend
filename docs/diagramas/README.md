# Diagramas — Rooster One

Conjunto de 61 diagramas gerados a partir do estado do sistema (schema Prisma, controllers, guards, catálogo de
permissões e rotas do frontend), e não de desenho prévio: 51 em Mermaid e 10 em HTML e CSS, estes destinados aos temas
cuja leitura depende de agrupamento e de disposição livres, não atendidos pelos tipos de diagrama do Mermaid.

- **`src/`**: fonte Mermaid (`.mmd`) de cada diagrama. Constitui a fonte de verdade: toda alteração do sistema que
  afete um diagrama deve ser refletida aqui.
- **`html/`**: diagramas em HTML e CSS. O conteúdo de cada um reside no elemento `.diagrama`, e o estilo comum, em
  `estilo.css`.
- **`png/`**: renderização de cada fonte, em alta resolução, utilizada no documento `Rooster-One-Documentacao-Geral.docx`,
  e `manifesto.json`, com o enquadramento de cada diagrama (orientação da página e tamanho de impressão).
- **`renderizar.mjs`**: renderizador único das duas origens, que calcula o enquadramento e grava o manifesto.

## Regeneração

Requer Node.js e Chrome ou Chromium instalado. O renderizador utiliza o Puppeteer com o navegador local, informado pela
variável `CHROME_PATH` ou localizado no caminho padrão do Windows.

```bash
# na raiz do backend, sem alterar o package.json (o mermaid-cli traz o Puppeteer e o layout ELK)
npm install --no-save @mermaid-js/mermaid-cli
node docs/diagramas/renderizar.mjs                    # todos os diagramas
node docs/diagramas/renderizar.mjs erd-hub,testes     # apenas os indicados
```

Após a regeneração, as figuras correspondentes devem ser substituídas no documento Word com o tamanho de impressão
registrado em `png/manifesto.json` (`larguraPol` e `alturaPol`, em polegadas) e, quando a orientação for `paisagem`, em
seção de página deitada.

## Enquadramento em página

O renderizador determina, para cada diagrama, a orientação da página e o tamanho de impressão, a partir do tamanho
natural do diagrama e do corpo do texto (16 px nos diagramas Mermaid e 19 px nos diagramas HTML):

| Regra | Valor |
|---|---|
| Área útil em pé (A4, margens do documento geral, descontada a legenda) | 6,74 × 9,0 polegadas |
| Área útil deitada | 10,1 × 6,2 polegadas |
| Página deitada | adotada quando aumenta o texto em ao menos 10% e a página em pé o deixaria abaixo de 9 pt |
| Tamanho máximo do texto | 11 pt, de modo que diagramas pequenos não sejam ampliados sem necessidade |
| Resolução | 350 pontos por polegada no tamanho impresso, com no mínimo o dobro da escala natural |

Cada diagrama ocupa, assim, a maior área disponível, até a largura ou a altura útil e, se necessário, a página inteira.
O manifesto registra o corpo de texto resultante (`fontePt`). Na versão de outubro de 2026, 12 diagramas são
apresentados em página deitada; o texto impresso varia de 7,1 a 11 pt (49 diagramas com ao menos 9 pt), e a resolução,
de 350 a 488 pontos por polegada. No documento geral, cada figura permanece na mesma página que a sua legenda.

Quando um diagrama resulta em texto pequeno, a correção deve ser feita **na fonte do diagrama, e nunca pela redução da
figura**. Em ordem de eficácia:

1. **Redução de níveis verticais.** Um fluxo com 20 etapas em coluna única não cabe em página. As etapas devem ser
   agrupadas em nós de nível conceitual mais alto (o passo a passo pertence ao texto, e não à figura) ou divididas em
   duas figuras por fase, procedimento adotado nos processos financeiro e de atividade e entrega. No processo de
   reserva, os três desvios de rejeição foram reunidos em um único nó, com o motivo indicado em cada seta.
2. **Quebras de linha explícitas (`<br/>`)** nos rótulos longos, com linhas de até cerca de 24 caracteres. O Mermaid
   quebra automaticamente os rótulos de seta e de losango, o que pode isolar palavras, e, nos participantes dos
   diagramas de sequência, hifeniza as palavras que excedem a largura (por exemplo, `Usuarios<br/>Service`, em vez de
   `UsuariosService`). Losango com rótulo em uma única linha longa torna-se desproporcionalmente alto.
3. **Layout ELK** (`"layout":"elk"` no bloco `init`) nos diagramas ER e nos diagramas de estado com transições
   paralelas (`estado-matricula` e `estado-entrega`): reduz cruzamentos e sobreposição de rótulos e, nos seis ERDs de
   texto menor, elevou o corpo de 6,8–7,7 pt para 8,3–10,2 pt, com quatro deles passando à página em pé. Nos demais diagramas de estado e nos fluxogramas, o ELK produziu texto menor e
   não é utilizado.
4. **Espaçamentos compactos** por tipo de diagrama (ver Convenções).
5. **Alargamento dos nós** com `"wrappingWidth": 420` nos fluxogramas de rótulos extensos (`ativ-atividade`,
   `ativ-financeiro` e `ativ-financeiro-2`), o que evita nós altos e diagrama estreito.
6. **Redução de atributos nos diagramas ER.** Cada atributo aumenta a altura da caixa; devem constar a chave e os
   campos relevantes para a relação, pois o dicionário completo está em `database/02-entidades.md`.

**Procedimento ineficaz** (verificado): a substituição de `flowchart TD` por `LR` em fluxo longo apenas converte excesso
de altura em excesso de largura. O processo financeiro chegou a resultar 14 vezes mais largo que alto, e o processo de
reserva, em teste de outubro de 2026, cairia de 7,3 para cerca de 5 pt, mesmo em página deitada.

## Diagramas em HTML

- Conteúdo no elemento `.diagrama`, com largura fixa de 980 px (1.500 px no mapa de navegação), capturado pelo Puppeteer
  na resolução calculada para o tamanho de impressão.
- Estilo comum em `estilo.css`, sem recursos externos (fonte Segoe UI do sistema), com corpo de texto de 19 px.
- Cores por área de atuação: azul para o administrativo e o núcleo do sistema, verde para o acadêmico, âmbar para o
  financeiro e para os avisos, roxo para a extensão, vermelho para restrições e negativas e cinza para os recursos
  transversais.
- Texto acentuado, ao contrário das fontes Mermaid, uma vez que a renderização ocorre no próprio navegador.

## Catálogo

O número entre parênteses indica a figura correspondente no documento geral (versão de outubro de 2026). As Figuras 57 e
58 são capturas de tela do Manual do Usuário (`docs/manual-usuario/imagens/`) e não constam deste diretório.

| Categoria | Diagramas |
|---|---|
| Visão geral (HTML) | `modulos` (1), `linha-do-tempo` (63) |
| Modelo de dados (ERD) | `erd-geral` (2), `erd-hub` (3), `erd-desk` (4), `erd-rooms` (5), `erd-assets` (6), `erd-academy` (7), `erd-learn` (8), `erd-finance` (9), `erd-boost` (10) |
| Segurança e autorização | `auth-dupla` (11), `permissao` (12, HTML), `sessao` (13, HTML), `rbac-modelo` (14), `camadas-autorizacao` (15), `camadas-permissao-front` (16), `cifragem` (17, HTML) |
| Contexto e arquitetura | `contexto` (18), `atores` (19), `arquitetura-geral` (20), `componentes` (21), `implantacao` (22), `integracao-modulos` (23), `dependencias-modulos` (24) |
| Casos de uso | `casos-uso-geral` (25), `casos-uso-geral-2` (26), `casos-uso-hub` (27), `casos-uso-desk` (28), `casos-uso-academy` (29), `casos-uso-boost` (30) |
| Sequência | `seq-login` (31), `seq-autorizacao` (32), `seq-permissao` (33), `seq-ticket` (34), `seq-reserva` (35), `seq-correcao-nota` (36), `seq-cobranca-lote` (37), `seq-certificado` (38) |
| Atividade (processos) | `ativ-autenticacao` (39), `ativ-reserva` (40), `ativ-patrimonio` (41), `ativ-academico` (42), `ativ-atividade` (43), `ativ-atividade-2` (44), `ativ-financeiro` (45), `ativ-financeiro-2` (46) |
| Estados | `estado-ticket` (47), `estado-reserva` (48), `estado-patrimonio` (49), `estado-usuario` (50), `estado-matricula` (51), `estado-atividade` (52), `estado-entrega` (53), `estado-cobranca` (54), `estado-matricula-boost` (55) |
| Interface e assistente (HTML) | `mapa-navegacao` (56), `roteiro` (59), `assistente` (60) |
| Testes e operação (HTML) | `testes` (61), `instalador` (62) |

## Convenções

- Rótulos sem acentuação nas fontes Mermaid, para evitar problemas de renderização em alguns ambientes; o texto
  explicativo, acentuado, consta do documento, e não da figura.
- Espaçamentos compactos no bloco `init` de cada fonte: sequência com `mirrorActors: false`, `wrap: true`,
  `width: 150`, `actorMargin: 30` e `messageMargin: 24` (16 em `seq-ticket`); fluxogramas com `nodeSpacing: 26`,
  `rankSpacing: 32` e `padding: 6`, e `subGraphTitleMargin` nos diagramas com agrupamentos, para que o título do
  agrupamento não encoste nos nós; estados com `nodeSpacing: 28` e `rankSpacing: 32`; ER com `entityPadding: 8` e
  `minEntityWidth: 60`.
- Rótulos de seta com fundo branco opaco, aplicado pelo renderizador (`CSS_MERMAID`), para que nenhuma linha atravesse
  o texto; o padrão do Mermaid é semitransparente.
- Ligações invisíveis (`~~~`) posicionam elementos isolados, como avisos e notas, fora do trajeto das setas
  (`auth-dupla` e `dependencias-modulos`).
- Os diagramas de estado e de sequência citam, quando aplicável, a regra de negócio (RN0XX) correspondente; ver
  `docs/system/04-regras-de-negocio.md`.
- Não foram produzidos diagramas de infraestrutura de produção, por inexistir ambiente de produção; a ausência é
  registrada no documento, em vez de ilustrada por desenho hipotético. O diagrama `implantacao` representa o ambiente de
  desenvolvimento e assinala, à parte, o ferramental implementado e ainda sem ambiente de destino (Dockerfile,
  docker-compose e integração contínua, descrita em `docs/operations/05-cicd.md`).
- Revisão de 01/10/2026: `erd-geral` atualizado para representar o professor como orientador de curso do Boost
  (relação N:N por `CursoOrientadorBoost`), e não como instrutor responsável.
- Revisão de 01/10/2026 (complemento): `casos-uso-boost` refeito com os atores vigentes (gestor, orientador,
  administrador, aluno externo e visitante), em substituição ao ator único "instrutor", e com os casos de verificação
  de certificado, vínculo de orientadores e gestão de contas externas; `contexto` corrigido para 64 tabelas.
- Revisão de 02/10/2026: `casos-uso-boost` acrescido do ator "aluno da instituição" (login institucional no portal)
  e do caso "matricular e cancelar matrículas" da gestão; "gerir contas externas" passou a "gerir contas do portal".
- Revisão de 02/10/2026 (recuperação de senha do portal): `erd-boost` acrescido de `RedefinicaoSenhaBoost` e do
  vínculo opcional `BoostUsuario.usuarioId`; `contexto` atualizado para 65 tabelas.
- Revisão de 02/10/2026 (questões do Learn): `erd-learn` acrescido de `QuestaoAtividade`, `AlternativaQuestao` e
  `RespostaQuestao` e do vínculo opcional `AnexoEntrega.questaoId`; `erd-geral` acrescido da relação entre atividade
  e questão; `estado-entrega` acrescido da correção automática; `ativ-atividade-2` acrescido do fluxo de correção
  automática e por questão; `contexto` atualizado para 68 tabelas.
- Revisão de 07/10/2026 (legibilidade): renderização unificada em `renderizar.mjs`, com enquadramento por diagrama,
  350 pontos por polegada e manifesto; dez diagramas em HTML (`modulos`, `permissao`, `sessao`, `cifragem`, `roteiro`,
  `assistente`, `testes`, `instalador`, `linha-do-tempo` e `mapa-navegacao`, este em substituição à fonte Mermaid, cuja
  largura tornava o texto ilegível); layout ELK nos ERDs, em `estado-matricula` e em `estado-entrega`; espaçamentos
  compactos, quebras de linha explícitas e rótulos de seta opacos em todos os diagramas Mermaid; `ativ-reserva`
  reorganizado, com os desvios de rejeição reunidos; `casos-uso-boost` com os dois tipos de aluno do portal agrupados.
- Revisão de 07/10/2026 (conferência com o código): `seq-login` e `ativ-autenticacao` (o acesso efetivo integra a
  resposta do login, que grava a sessão com o hash do refresh token; a falha é registrada como `login_falhou`);
  `seq-autorizacao` (o `JwtAuthGuard` consulta o usuário a cada requisição e recusa o inativo com `401`);
  `seq-certificado` (conclusão pelo botão ou ao atingir 90% do vídeo; atualização da matrícula e emissão em operações
  sequenciais, sem transação única, com emissão idempotente e arquivo cifrado); `seq-cobranca-lote` (matrículas ativas
  consultadas diretamente, notificação ao aluno e política de multa e juros do serviço); `seq-ticket` (evento WebSocket
  emitido pelo controller após a gravação e `encerradoEm` derivado no controller); `seq-reserva` e `ativ-reserva`
  (limite de 15 dias, ou de 365 com a permissão de prazo estendido); `componentes` (importações efetivas dos módulos,
  inclusive `AssistenteModule`, Rooms dependente do Academy e portal dependente do Boost); `integracao-modulos`
  (vínculo entre reserva e turma); `dependencias-modulos` e `auth-dupla` (login institucional do portal);
  `camadas-permissao-front` (perfil de interface deduzido das permissões, sem visão de demonstração); `implantacao`
  (ferramental sem ambiente de destino e arquivos cifrados); `estado-matricula-boost` (cancelamento e reativação pela
  gestão; matrícula concluída não pode ser cancelada).
