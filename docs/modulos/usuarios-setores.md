# Módulo Usuários-Setores

## Objetivo

Associar usuários a setores específicos da organização.

## Responsabilidades

- registrar vinculação entre usuários e setores;
- manter referência de estrutura organizacional.

## Entidades pertencentes

- UsuarioSetor

## Relacionamentos com outros módulos

- depende de Usuario e Setor.

## Fluxo de funcionamento

```mermaid
flowchart LR
    A[Usuário] --> B[Setor]
    B --> C[Vínculo persistido]
```

## Principais endpoints

| Método | Endpoint | Descrição |
| --- | --- | --- |
| POST | /usuarios-setores | Cria vínculo |
| GET | /usuarios-setores | Lista vínculos |
| GET | /usuarios-setores/:id | Busca vínculo |
| PATCH | /usuarios-setores/:id | Atualiza vínculo |
| DELETE | /usuarios-setores/:id | Remove vínculo |

## Dependências

- usuários e setores

## Regras de negócio relacionadas

- um usuário pode estar associado a vários setores;
- setores duplicados para um mesmo usuário devem ser evitados.

## Funcionalidades futuras

- vinculação por lotes;
- validação de pertencimento por departamento.

## Observações técnicas

Este módulo facilita a organização funcional e futura análise de estrutura corporativa.
