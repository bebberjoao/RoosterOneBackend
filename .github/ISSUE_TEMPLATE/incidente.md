---
name: Incidente
about: Registro de incidente em operação (indisponibilidade, dado incorreto ou acesso indevido)
title: "[INCIDENTE] "
labels: incidente
---

## Severidade

- [ ] **S1 — Crítica**: sistema indisponível, perda ou exposição de dado pessoal, acesso indevido confirmado → resposta imediata
- [ ] **S2 — Alta**: módulo inoperante, gravação de dado incorreto, operação acadêmica ou financeira bloqueada no prazo → no mesmo dia
- [ ] **S3 — Média**: funcionalidade degradada, com alternativa disponível → no ciclo seguinte
- [ ] **S4 — Baixa**: defeito estético ou de conveniência → lista de pendências

## Sintoma

<!-- Descrição exata do que foi observado, com a mensagem de erro literal, se houver. -->

## Período

<!-- Horário de início e de detecção. -->

## Usuários afetados

<!-- Usuários, perfis e módulos afetados; indicar se há dado pessoal envolvido. -->

## Módulo

- [ ] Hub  - [ ] Desk  - [ ] Rooms  - [ ] Assets  - [ ] Academy
- [ ] Learn  - [ ] Student  - [ ] Finance  - [ ] Boost  - [ ] Transversal

## Contenção aplicada

<!-- A restauração do serviço precede a identificação da causa.
     Em incidente de segurança, a primeira medida é a revogação do acesso
     (a desativação do usuário elimina o acesso efetivo na requisição seguinte
     e revoga as sessões abertas); a investigação ocorre em seguida. -->

## Investigação

<!-- O log de auditoria (LogAuditoria) registra login, sessões, operações sobre
     usuários e permissões, redefinição de senha, notas, cobranças e contas
     externas, com autor e data; o LogErro registra as respostas com status
     igual ou superior a 500.
     LIMITAÇÃO: o log não registra a leitura de dados; em suspeita de acesso
     indevido a dado acadêmico ou financeiro, não há trilha das consultas
     realizadas (risco R-07 em docs/engineering/13-governanca.md). -->

## Causa raiz

<!-- Investigação até a causa, e não apenas até o desaparecimento do sintoma. -->

## Correção

<!-- Conforme o processo de mudança, com indicação da classe de risco. -->

## Outros pontos com o mesmo padrão

<!-- Questão obrigatória: o padrão de um defeito tende a repetir-se em código
     semelhante ainda não revisado. -->

## Registro do aprendizado

- [ ] S1 ou S2: entrada incluída em `docs/engineering/08-divida-tecnica.md`, com o **padrão** do erro
- [ ] Se detectável por revisão: questão incluída na lista de verificação de `docs/engineering/12-processo-de-desenvolvimento.md`
