# Exemplos de Requisição/Resposta

Exemplos reais de uso, baseados nos DTOs e no comportamento confirmado dos controllers. `<TOKEN>` é sempre um `accessToken` obtido em `/auth/login`.

## 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@exemplo.com","senha":"<SENHA>"}'
```

Resposta (`201`):

```json
{
  "usuario": { "id": "<uuid>", "nome": "Nome do Usuário", "email": "usuario@exemplo.com" },
  "acesso": { "usuarioId": "<uuid>", "permissoes": [ /* ... */ ], "modulos": [ /* ... */ ] },
  "accessToken": "<TOKEN>"
}
```

Credenciais inválidas ou usuário inativo → `401 Unauthorized`.

## 2. Criar um recurso simples (setor)

```bash
curl -X POST http://localhost:3000/setores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"nome":"Suporte de TI","descricao":"Atendimento técnico e infraestrutura."}'
```

Resposta (`201`): o setor criado, incluindo `id` gerado.

## 3. Erro de permissão (403)

Usuário autenticado, mas sem a permissão `Rooster Hub / /hub/usuarios / criar`:

```bash
curl -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_SEM_PERMISSAO>" \
  -d '{"nome":"Teste","email":"teste@exemplo.com","senhaHash":"Senha123"}'
```

Resposta (`403`):

```json
{ "message": "Forbidden resource", "error": "Forbidden", "statusCode": 403 }
```

## 4. Erro de validação (400)

Corpo com campo obrigatório faltando (`evento`) ao criar uma reserva:

```bash
curl -X POST http://localhost:3000/reservas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"codigo":"RES-0001","ambienteId":"<uuid>","responsavel":"Fulano","data":"2026-10-01","horarioInicio":"10:00","horarioFim":"11:00","participantes":10}'
```

Resposta (`400`), `ValidationPipe` lista todos os campos que falharam de uma vez:

```json
{ "message": ["evento must be longer than or equal to 2 characters"], "error": "Bad Request", "statusCode": 400 }
```

## 5. Conflito de horário de reserva (409)

Reservar o mesmo ambiente/horário de uma reserva já existente:

```json
{ "message": "Conflito de horário com a reserva \"Aula de Redes\" (10:00–11:00).", "error": "Conflict", "statusCode": 409 }
```

## 6. Upload de anexo (multipart)

```bash
curl -X POST http://localhost:3000/chamados/<ticketId>/anexos \
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

Sem arquivo no campo `arquivo` → `400 Bad Request` ("Nenhum arquivo enviado").

## 7. Esqueci minha senha (sempre a mesma resposta)

```bash
curl -X POST http://localhost:3000/auth/esqueci-senha \
  -H "Content-Type: application/json" \
  -d '{"email":"qualquer@exemplo.com"}'
```

Resposta (`201`), **idêntica exista ou não o e-mail**:

```json
{ "message": "Se o e-mail existir, você receberá as instruções de redefinição." }
```

## 8. Criar série de reserva recorrente

```bash
curl -X POST http://localhost:3000/reservas/serie \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "codigo":"RES-SERIE-01","ambienteId":"<uuid>","responsavel":"Fulano",
    "evento":"Aula semanal","data":"2026-10-01","horarioInicio":"10:00","horarioFim":"11:00",
    "participantes":10,"recorrencia":"semanal","repetirAte":"2026-10-22"
  }'
```

Resposta (`201`): `{ "serieId": "<uuid>", "reservas": [ /* uma por ocorrência */ ] }`. Se qualquer ocorrência conflitar com outra reserva existente, a resposta é `409` e **nenhuma** reserva da série é criada.
