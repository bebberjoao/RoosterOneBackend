# Integrações — Rooster One

## Integrações externas

| Integração | Tipo | Situação | Detalhamento |
|---|---|---|---|
| SMTP (envio de e-mail) | Serviço externo opcional | Implementada, condicional | `src/mail/mail.service.ts`, por `nodemailer`. Sem `SMTP_HOST`, não há envio: o conteúdo do e-mail é registrado em log. Não há acoplamento a provedor específico; qualquer servidor SMTP padrão é compatível. O estado e o envio de teste estão disponíveis em `/configuracoes/email`. |

## Comunicação interna (não constitui integração externa)

| Mecanismo | Entre | Detalhamento |
|---|---|---|
| REST (HTTP/JSON) | Frontend ↔ Backend | Canal principal; toda leitura e escrita é realizada por ele. |
| WebSocket (Socket.IO) | Frontend ↔ Backend | Aviso de nova mensagem em duas conversas: chamado (namespace `/desk`) e conversa do Boost (namespace `/boost`, que autentica token do Hub ou do Boost conforme a declaração `tipo` do JWT). Nenhum dos dois é fonte de verdade nem persiste dados; a mensagem já foi gravada pelo REST antes do aviso. Ver `docs/engineering/05-fluxos-tecnicos.md`. |

## Pagamento e nota fiscal: simulação interna por decisão de projeto

O Rooster Finance (`src/rooster-finance/`) possui os conceitos de boleto, PIX e nota fiscal, mas nenhum deles se
conecta a serviço externo:

| Recurso | Implementado | Não implementado |
|---|---|---|
| Boleto e PIX (`FinanceService.emitirBoleto`, `boleto.service.ts`) | `nossoNumero`, `linhaDigitavel` (47 posições, em formato válido) e `pixCopiaECola` gerados internamente; PDF do boleto gerado sob demanda com `pdfkit`. A baixa de pagamento é sempre manual (`POST /cobrancas/:id/marcar-pago`). | Integração com instituição financeira ou provedor de pagamento: nada é transmitido nem compensado. |
| Nota fiscal (`notafiscal.service.ts`) | Documento interno numerado (`NFP-` ou `NFS-2026-0001`), com PDF (`pdfkit`) e XML simples gerados e gravados cifrados em `uploads/notas-fiscais/`. | Transmissão à SEFAZ ou à Receita e certificado digital A1 ou A3; o documento não possui validade fiscal (o próprio PDF e o XML o informam). |

Trata-se de decisão explícita, tomada na construção do Finance: o controle exclusivamente interno foi preferido a
uma integração que exigiria credenciais bancárias e certificado digital indisponíveis ao projeto. Caso uma
integração venha a ser necessária, os pontos de extensão são `FinanceService.emitirBoleto` (substituição da
geração local por chamada à API de instituição financeira ou provedor de pagamento) e `NotaFiscalService.emitir`
(substituição por provedor de NF-e homologado).

## Integrações inexistentes

Não há evidência, no código, de:

- serviço de armazenamento de objetos em nuvem (os arquivos permanecem, cifrados, no disco do servidor, em
  `uploads/*`);
- autenticação única (SSO) ou provedor de identidade externo (Google, Microsoft, SAML etc.);
- serviço de mensageria ou fila (RabbitMQ, SQS, Kafka etc.);
- serviço externo de monitoramento ou observabilidade (Sentry, Datadog, New Relic etc.);
- rede de distribuição de conteúdo (CDN).

## Evolução prevista

- Com o crescimento do volume de uploads, migrar `uploads/` do disco local para armazenamento de objetos
  compatível com S3; atualmente, uma nova implantação sem volume persistente eliminaria os arquivos.
- Com a execução em múltiplos servidores, os gateways WebSocket exigiriam adaptador compartilhado (por exemplo,
  Redis), pois atualmente mantêm as salas na memória de um único processo Node.
