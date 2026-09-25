---
name: Incidente
about: Registro de incidente em operação (indisponibilidade, dado incorreto, acesso indevido)
title: "[INCIDENTE] "
labels: incidente
---

## Severidade

- [ ] **S1 — Crítica**: sistema indisponível, perda ou exposição de dado pessoal, acesso indevido confirmado → resposta imediata
- [ ] **S2 — Alta**: módulo inoperante, dado incorreto sendo gravado, operação acadêmica/financeira bloqueada no prazo → mesmo dia
- [ ] **S3 — Média**: funcionalidade degradada com contorno disponível → próximo ciclo
- [ ] **S4 — Baixa**: defeito cosmético ou de conveniência → backlog

## Sintoma

<!-- O que foi observado, exatamente. Mensagem de erro literal, se houver. -->

## Quando

<!-- Horário de início e de detecção. -->

## Quem foi afetado

<!-- Quais usuários/perfis/módulos. Algum dado pessoal envolvido? -->

## Módulo

- [ ] Hub  - [ ] Desk  - [ ] Rooms  - [ ] Assets  - [ ] Academy
- [ ] Learn  - [ ] Student  - [ ] Finance  - [ ] Boost  - [ ] Transversal

## Contenção aplicada

<!-- Restaurar o serviço vem antes de entender a causa.
     Em incidente de segurança: PRIMEIRO revogar o acesso
     (desativar o usuário zera o acesso efetivo na requisição seguinte),
     depois investigar. -->

## Investigação

<!-- O log de auditoria (LogAuditoria) registra login, CRUD de usuário,
     concessão/revogação de permissão e redefinição de senha, com autor e data.
     LIMITAÇÃO: o log NÃO registra leitura de dado — numa suspeita de acesso
     indevido a dado acadêmico ou financeiro, não há trilha de quem consultou
     o quê (risco R-07 em docs/engineering/13-governanca.md). -->

## Causa raiz

<!-- Investigar até a causa, não até o sintoma sumir. -->

## Correção

<!-- Segue o processo de mudança; classificar a classe de risco. -->

## Onde mais esse mesmo padrão pode existir?

<!-- Pergunta obrigatória. O padrão de um defeito costuma se repetir em código
     semelhante ainda não revisado. -->

## Registro do aprendizado

- [ ] S1/S2: entrada acrescentada em `docs/engineering/08-divida-tecnica.md` com o **padrão** do erro
- [ ] Se detectável por revisão: pergunta acrescentada ao checklist em `docs/engineering/12-processo-de-desenvolvimento.md`
