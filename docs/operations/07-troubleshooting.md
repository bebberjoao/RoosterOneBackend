# Troubleshooting

Problemas reais e conhecidos deste projeto, levantados diretamente do código-fonte.

---

## Backend não sobe: falta `JWT_SECRET`

**Problema**: `npm run start:dev` (ou `start`/`start:prod`) falha imediatamente na inicialização.

**Causa**: `JWT_SECRET` não está definido no `.env` (ou não foi carregado). O módulo `src/auth/jwt-config.ts` exige essa variável sem nenhum valor padrão hardcoded — decisão deliberada para que a aplicação nunca suba assinando tokens com um segredo público/previsível.

**Diagnóstico**: o processo encerra e o terminal mostra o erro lançado por `jwtModuleOptions()`:

```
Error: JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar a aplicação.
```

**Solução**:
1. Confirme que existe um arquivo `.env` na raiz de `RoosterOneBackend-main` (não `.env.local`, não em outra pasta).
2. Adicione a linha `JWT_SECRET=<algum-valor-secreto>` a esse arquivo.
3. Confirme que `src/main.ts` importa `'dotenv/config'` no topo (é o que carrega o `.env` no processo) — se esse import tiver sido removido, nenhuma variável do `.env` é lida, mesmo que o arquivo exista e esteja correto.
4. Reinicie o backend.

---

## E-mail de redefinição de senha "não chega"

**Problema**: usuário solicita redefinição de senha, mas nenhum e-mail chega na caixa de entrada.

**Causa**: sem `SMTP_HOST` definido no `.env`, o `MailService` (`src/mail/mail.service.ts`) entra em **modo de log** por design — ele não tenta enviar e-mail de verdade, apenas registra o conteúdo (incluindo o link de redefinição) no log da aplicação. Isso não é uma falha: é o comportamento padrão em ambiente sem SMTP configurado, pensado para permitir testar o fluxo (token, link, expiração) sem depender de uma conta de e-mail real.

**Diagnóstico**: verifique o log do processo do backend (o terminal onde `npm run start:dev` está rodando) logo após a solicitação de redefinição. Devem aparecer linhas como:

```
[SMTP não configurado — modo dev] Para: usuario@exemplo.com | Assunto: <assunto do e-mail>
<conteúdo do e-mail sem HTML>
Link(s): http://localhost:8080/redefinir-senha?token=<token>
```

O link útil para testar o fluxo manualmente é o que aparece após `Link(s):`.

**Solução**:
- Se o objetivo é apenas testar o fluxo localmente: use o link impresso no log diretamente no navegador — não é um bug, é o comportamento esperado sem SMTP configurado.
- Se o objetivo é enviar e-mails de verdade: defina `SMTP_HOST` (e, conforme o provedor, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`) no `.env` e reinicie o backend. Ver `01-configuracao.md` para a tabela completa dessas variáveis.
- Confirme também que `FRONTEND_URL` está correto no `.env` — é essa variável que define o domínio/porta usados para montar o link (default `http://localhost:8080` se ausente).

---

## `EADDRINUSE` ao reiniciar o backend em modo watch

**Problema**: ao editar código com `npm run start:dev` rodando, o Nest tenta reiniciar e falha com um erro do tipo:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Causa**: em modo watch (`nest start --watch`), às vezes o processo Node anterior não é finalizado completamente antes do novo subir — comum no Windows quando o processo é encerrado de forma abrupta (fechar o terminal, `Ctrl+C` que não propaga corretamente, crash) e o processo continua com um handle aberto na porta 3000 (ou na porta definida em `PORT`).

**Diagnóstico e solução (Windows)**:

1. Descubra qual processo está segurando a porta (troque `3000` pela porta configurada, se diferente):

```bash
netstat -ano | findstr :3000
```

A última coluna da linha com `LISTENING` é o PID do processo.

2. Finalize esse processo pelo PID:

```bash
taskkill /PID <PID> /F
```

Ou, em PowerShell:

```powershell
Get-Process -Id <PID> | Stop-Process -Force
```

3. Rode `npm run start:dev` novamente.

Alternativa mais rápida se não precisar saber qual processo é: defina `PORT` para outro valor no `.env` temporariamente, ou finalize todos os processos `node.exe` órfãos do projeto (`taskkill /IM node.exe /F` — cuidado, isso encerra **qualquer** processo Node em execução na máquina, não só o do projeto).

---

## Frontend não autentica: 401 em toda chamada

**Problema**: toda requisição à API retorna 401, mesmo após login aparentemente bem-sucedido, ou a aplicação fica "voltando" para a tela de login sozinha.

**Causas possíveis** (verifique nesta ordem):

1. **Token expirado.** O JWT é assinado com expiração fixa de **8 horas** (`src/auth/jwt-config.ts`, `signOptions: { expiresIn: '8h' }`) e não há mecanismo de refresh token no backend. Passado esse tempo, qualquer chamada autenticada retorna 401 e é esperado que o usuário faça login novamente. O próprio cliente HTTP do frontend (`src/services/hub/client.ts`) já trata isso: ao receber um 401 com um token presente, ele limpa a sessão automaticamente (`session.clear()`), o que deve levar a tela de volta ao login.
2. **`VITE_API_URL` apontando para o backend errado.** Se o frontend estiver configurado para um host/porta onde não há um backend rodando (ou onde está rodando uma instância diferente, com usuários/base diferentes), toda chamada autenticada falhará. Confira o valor efetivo de `VITE_API_URL` (ou confirme que está usando o default `http://localhost:3000`) e compare com a porta real onde o backend subiu (ver log do `npm run start:dev`, `03-execucao.md`).
3. **Backend reiniciado com `JWT_SECRET` diferente.** Como o segredo não tem fallback fixo, se o `.env` do backend for alterado (valor de `JWT_SECRET` trocado) e o backend reiniciado, todos os tokens emitidos antes da troca passam a ser inválidos — qualquer sessão de frontend aberta antes disso passa a receber 401 até um novo login.

**Diagnóstico**:
- Abra o DevTools do navegador, aba Network, e confira o corpo/URL da requisição que retornou 401: a URL mostra exatamente para qual host a chamada foi feita (confirma ou descarta a causa 2).
- Se o login funciona mas as chamadas seguintes falham, é mais provável ser expiração de token ou mudança de `JWT_SECRET` no servidor (causas 1 e 3) do que erro de configuração de URL.

**Solução**: fazer login novamente (resolve 1 e 3); corrigir `VITE_API_URL` no `.env` do frontend e reiniciar `npm run dev` (resolve 2).
