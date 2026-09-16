# ADR-002 - Uso de Prisma como camada de persistência

## Contexto

Era necessário definir como o backend acessaria o banco de dados de forma segura e produtiva.

## Problema

O projeto precisava de uma camada de dados consistente, com tipagem forte e facilidade de evolução.

## Alternativas avaliadas

- acesso manual com SQL;
- TypeORM;
- Prisma.

## Decisão tomada

Adotar Prisma como ORM principal.

## Justificativa

O Prisma oferece tipagem forte, migrações organizadas e integração simples com o fluxo atual do projeto.

## Consequências

- esquema centralizado em arquivo único;
- evolução mais previsível do banco;
- maior clareza para desenvolvedores.
