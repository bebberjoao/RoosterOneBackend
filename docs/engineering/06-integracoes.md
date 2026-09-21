# Integrações — Rooster One

## Integrações externas reais

| Integração | Tipo | Status | Detalhe |
|---|---|---|---|
| SMTP (envio de e-mail) | Serviço externo opcional | Implementado, condicional | `src/mail/mail.service.ts`, via `nodemailer`. Sem `SMTP_HOST` configurado, não há envio real — o conteúdo do e-mail é só registrado em log. Nenhum provedor específico (SendGrid, SES, Gmail...) está acoplado no código; qualquer servidor SMTP padrão funciona. |

## Comunicação interna (não é integração externa)

| Mecanismo | Entre | Detalhe |
|---|---|---|
| REST (HTTP/JSON) | Frontend ↔ Backend | Canal principal, toda leitura/escrita passa por aqui. |
| WebSocket (Socket.IO) | Frontend ↔ Backend | Push de "chegou mensagem nova" em duas conversas: chamado (`namespace /desk`) e curso do Boost (`namespace /boost`, autentica token do Hub OU do Boost pelo claim `tipo` do JWT). Nenhum dos dois é fonte de verdade — não persiste nada por si só, o dado já foi salvo via REST antes do push. Ver `docs/engineering/05-fluxos-tecnicos.md`. |

## Pagamento e nota fiscal — simulados internamente, decisão deliberada (não pendência)

O Rooster Finance (`src/rooster-finance/`) tem o *conceito* de boleto/PIX e nota fiscal, mas nenhum dos dois se conecta a um serviço externo real:

| Recurso | O que existe | O que não existe |
|---|---|---|
| Boleto/PIX (`FinanceService.emitirBoleto`, `boleto.service.ts`) | `nossoNumero`/`linhaDigitavel` (47 posições, formato válido) e `pixCopiaECola` gerados internamente; PDF do boleto montado sob demanda com `pdfkit`. Baixa de pagamento é sempre manual (`POST /cobrancas/:id/marcar-pago`). | Nenhuma integração com banco/PSP (Itaú, Bradesco, Sicredi, PIX do Bacen, etc.) — nada é transmitido, nada compensa de verdade. |
| Nota fiscal (`notafiscal.service.ts`) | Documento interno numerado (`NFP-`/`NFS-2026-0001`), PDF (`pdfkit`) e XML simples gerados e salvos em `uploads/notas-fiscais/`. | Nenhuma transmissão à SEFAZ/Receita, nenhum certificado digital A1/A3 — o documento não tem validade fiscal legal (o próprio PDF/XML avisa isso no texto). |

Essa decisão foi tomada explicitamente com o usuário ao construir o Finance (controle 100% interno preferido a uma integração real que exigiria credenciais de banco/certificado digital que o time não tem). Se um dia uma integração real entrar em pauta, os pontos de extensão naturais são `FinanceService.emitirBoleto` (trocar geração local por chamada a uma API de banco/PSP) e `NotaFiscalService.emitir` (trocar geração local por um provedor de NF-e homologado).

## Integrações não identificadas no código analisado

Nenhuma evidência de:
- provedor de armazenamento em nuvem (arquivos de anexo/material/certificado/nota fiscal ficam em disco local do servidor, `uploads/*`, não em S3/Blob/equivalente);
- single sign-on (SSO) ou provedor de identidade externo (Google, Microsoft, SAML...);
- serviço de mensageria/fila (RabbitMQ, SQS, Kafka...);
- serviço de monitoramento/observabilidade (Sentry, Datadog, New Relic...);
- CDN.

## Recomendação futura

- Se o volume de upload crescer, mover `uploads/anexos-tickets/` de disco local para um armazenamento de objeto (S3-compatível) — hoje um redeploy sem volume persistente perderia os arquivos.
- Se o sistema for para múltiplos servidores, o WebSocket (`MensagensGateway`) precisaria de um adapter compartilhado (ex.: Redis) — hoje ele assume um único processo Node segurando as salas em memória.
