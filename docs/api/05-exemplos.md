# Exemplos de Requisição e Resposta

Exemplos baseados nos DTOs e no comportamento verificado dos controllers. Todas as rotas de negócio utilizam o
prefixo de versão `/v1`. `<TOKEN>` representa um `accessToken` obtido em `/v1/auth/login`.

## 1. Login

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@exemplo.com","senha":"<SENHA>"}'
```

Resposta (`201`):

```json
{
  "usuario": { "id": "<uuid>", "nome": "Nome do Usuário", "email": "usuario@exemplo.com" },
  "acesso": { "usuarioId": "<uuid>", "permissoes": [ /* ... */ ], "modulos": [ /* ... */ ] },
  "accessToken": "<TOKEN>",
  "refreshToken": "<64 caracteres hexadecimais>"
}
```

Credenciais inválidas ou usuário inativo: `401 Unauthorized`.

## 2. Renovação de sessão

```bash
curl -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

Resposta (`201`): mesmo formato do login, com novo par de tokens; o refresh token utilizado é revogado. Token
inválido, revogado ou expirado: `401`, com `"Sessão inválida ou expirada."`.

## 3. Criação de recurso simples (setor)

```bash
curl -X POST http://localhost:3000/v1/setores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"nome":"Suporte de TI","descricao":"Atendimento técnico e infraestrutura."}'
```

Resposta (`201`): o setor criado, com o `id` gerado. Nome já existente: `409 Conflict`.

## 4. Erro de permissão (403)

Usuário autenticado, sem a permissão `Rooster Hub / /hub/usuarios / criar`:

```bash
curl -X POST http://localhost:3000/v1/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_SEM_PERMISSAO>" \
  -d '{"nome":"Teste","email":"teste@exemplo.com","senhaHash":"Senha123"}'
```

Resposta (`403`):

```json
{ "message": "Sem permissão para criar em /hub/usuarios.", "error": "Forbidden", "statusCode": 403 }
```

## 5. Erro de validação (400)

Corpo sem campo obrigatório (`evento`) na criação de reserva:

```bash
curl -X POST http://localhost:3000/v1/reservas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"codigo":"RES-0001","ambienteId":"<uuid>","responsavel":"Fulano","data":"2026-10-01","horarioInicio":"10:00","horarioFim":"11:00","participantes":10}'
```

Resposta (`400`); o `ValidationPipe` relaciona todas as regras violadas:

```json
{ "message": ["evento must be longer than or equal to 2 characters"], "error": "Bad Request", "statusCode": 400 }
```

## 6. Conflito de horário de reserva (409)

Reserva do mesmo ambiente em horário já ocupado:

```json
{ "message": "Conflito de horário com a reserva \"Aula de Redes\" (10:00–11:00).", "error": "Conflict", "statusCode": 409 }
```

## 7. Envio de anexo (multipart)

```bash
curl -X POST http://localhost:3000/v1/chamados/<ticketId>/anexos \
  -H "Authorization: Bearer <TOKEN>" \
  -F "arquivo=@evidencia.png;type=image/png"
```

Resposta (`201`):

```json
{
  "id": "<uuid>",
  "ticketId": "<ticketId>",
  "usuarioId": "<uuid>",
  "nomeArquivo": "evidencia.png",
  "caminho": "<uuid-gerado>.png",
  "tipo": "image/png",
  "tamanho": 48213,
  "criadoEm": "2026-09-17T12:00:00.000Z"
}
```

O arquivo é gravado cifrado, com o nome gerado indicado em `caminho`. Respostas de erro:

- sem arquivo no campo `arquivo`, ou com tipo não aceito: `400`, com
  `"Nenhum arquivo enviado, ou formato não aceito (campo \"arquivo\")."`;
- conteúdo incompatível com o tipo declarado (por exemplo, executável declarado como `image/png`): `400`;
- arquivo acima de 10 MB: `413 Payload Too Large`.

## 8. Recuperação de senha (resposta invariável)

```bash
curl -X POST http://localhost:3000/v1/auth/esqueci-senha \
  -H "Content-Type: application/json" \
  -d '{"email":"qualquer@exemplo.com"}'
```

Resposta (`201`), **idêntica exista ou não o e-mail**:

```json
{ "message": "Se o e-mail existir, você receberá as instruções de redefinição." }
```

## 9. Série de reservas recorrentes

```bash
curl -X POST http://localhost:3000/v1/reservas/serie \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "codigo":"RES-SERIE-01","ambienteId":"<uuid>","responsavel":"Fulano",
    "evento":"Aula semanal","data":"2026-10-01","horarioInicio":"10:00","horarioFim":"11:00",
    "participantes":10,"recorrencia":"semanal","repetirAte":"2026-10-22"
  }'
```

Resposta (`201`): `{ "serieId": "<uuid>", "reservas": [ /* uma por ocorrência */ ] }`. Se alguma ocorrência
conflitar com reserva existente, a resposta é `409`, e **nenhuma** reserva da série é criada. Exige as permissões
`solicitar` e `solicitar-recorrente`, e a última ocorrência deve respeitar o limite de antecedência do usuário.

## 10. Verificação de saúde

```bash
curl http://localhost:3000/health
```

Resposta (`200`): `{ "status": "ok", "banco": "ok", "uptimeSegundos": 3412 }`. Banco inacessível: `503`, com
`"status": "degradado"`. A rota não utiliza o prefixo `/v1`.
