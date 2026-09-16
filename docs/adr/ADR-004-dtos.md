# ADR-004 - Uso de DTOs para validação

## Contexto

Era necessário padronizar a entrada de dados nas rotas da API.

## Problema

Sem DTOs, a validação pode ficar dispersa e inconsistente.

## Alternativas avaliadas

- validar diretamente no controller;
- validar no service;
- usar DTOs com validação estrutural.

## Decisão tomada

Usar DTOs para definir e validar a estrutura das entradas da API.

## Justificativa

Os DTOs deixam as rotas mais organizadas e permitem validar dados uma vez, com consistência.

## Consequências

- melhor clareza para quem consome a API;
- redução de erros de entrada;
- abertura para validações futuras específicas de negócio.
