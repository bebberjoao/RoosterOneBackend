# ADR-003 - Organização modular por domínio

## Contexto

O backend precisava crescer sem perder coesão e sem misturar responsabilidades entre módulos.

## Problema

A falta de modularização tende a gerar acoplamento e dificultar a evolução do sistema.

## Alternativas avaliadas

- estrutura monolítica sem separação;
- separação por pasta genérica;
- modularização por domínio.

## Decisão tomada

Organizar o backend em módulos por domínio, como usuários, setores, perfis e permissões.

## Justificativa

Essa abordagem facilita manutenção, entendimento e expansão da aplicação.

## Consequências

- cada módulo possui responsabilidade própria;
- novos recursos podem ser adicionados sem grandes impactos;
- o projeto torna-se mais escalável.
