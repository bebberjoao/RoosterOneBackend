# Solução de Problemas

Problemas conhecidos do projeto, com causa, diagnóstico e solução, levantados a partir do código-fonte.

---

## Backend não inicia: `JWT_SECRET` ou `FILE_ENCRYPTION_KEY` ausente

**Problema**: `npm run start:dev` (ou `start` e `start:prod`) é encerrado na inicialização.

**Causa**: variável obrigatória ausente no `.env` ou não carregada. `src/auth/jwt-config.ts` exige `JWT_SECRET`
e `src/common/file-encryption.util.ts` exige `FILE_ENCRYPTION_KEY`, ambas sem valor padrão, para que a
aplicação nunca assine tokens com segredo previsível nem grave arquivos sem poder cifrá-los.

**Diagnóstico**: o terminal exibe uma das mensagens:

```
Error: JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar a aplicação.
Error: FILE_ENCRYPTION_KEY não definida. Configure a variável de ambiente antes de iniciar a aplicação.
Error: FILE_ENCRYPTION_KEY inválida: precisa decodificar (base64) para exatamente 32 bytes (AES-256).
```

**Solução**:
1. Confirmar a existência do arquivo `.env` na raiz de `RoosterOneBackend-main`.
2. Definir as variáveis, com os comandos de geração indicados no `.env.example`.
3. Confirmar que `src/main.ts` importa `'dotenv/config'` em sua primeira linha; sem essa importação, nenhuma
   variável do `.env` é carregada.
4. Reiniciar o backend.

---

## Arquivos existentes não abrem após troca de chave ou restauração

**Problema**: listagens exibem anexos, documentos ou certificados, mas o download falha.

**Causa**: a `FILE_ENCRYPTION_KEY` configurada difere da chave com que os arquivos foram cifrados — por exemplo,
após restauração de backup em servidor com outra chave, ou após troca da chave.

**Diagnóstico**: executar `node scripts/verificar-arquivo-cifrado.js <caminho-do-arquivo>` (requer `npm run
build`); a mensagem "A chave configurada não decifra este arquivo" confirma a divergência.

**Solução**: restaurar a chave original. Não há recuperação de arquivos sem a chave com que foram cifrados (ver
`06-backup-e-recuperacao.md`).

---

## E-mail de redefinição de senha não é recebido

**Problema**: o usuário solicita a redefinição de senha e nenhum e-mail é recebido.

**Causa**: sem `SMTP_HOST` definido, o `MailService` (`src/mail/mail.service.ts`) não envia e-mails. Fora de
produção, registra no log o destinatário, o assunto e o conteúdo, com o token de redefinição **mascarado**
(`token=***`) por segurança; em produção, registra apenas a falha de configuração.

**Diagnóstico**: no log do backend, logo após a solicitação, aparecem linhas como:

```
[SMTP não configurado — modo dev] Para: usuario@exemplo.com | Assunto: <assunto>
Link(s): http://localhost:8080/redefinir-senha?token=***
```

Como o token é mascarado, o link registrado **não pode** ser utilizado para concluir a redefinição.

**Solução**:
- Para envio real, definir `SMTP_HOST` (e, conforme o provedor, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
  `SMTP_PASS` e `MAIL_FROM`) e reiniciar o backend. O administrador pode confirmar a configuração e enviar um
  e-mail de teste na seção "E-mail" de `/settings`.
- Para testar o fluxo localmente sem provedor externo, utilizar um servidor SMTP de captura, como o Mailpit
  (`SMTP_HOST=localhost`, `SMTP_PORT=1025`), e abrir o e-mail capturado na interface web da ferramenta.
- Confirmar o valor de `FRONTEND_URL`, que define o endereço usado no link (padrão `http://localhost:8080`).

---

## `EADDRINUSE` ao reiniciar o backend em modo de observação

**Problema**: com `npm run start:dev` em execução, a reinicialização após uma alteração falha com:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Causa**: no modo de observação (`nest start --watch`), o processo anterior pode não ser finalizado antes do
início do novo — situação comum no Windows após encerramento abrupto (fechamento do terminal, interrupção não
propagada ou falha), com o processo mantendo a porta 3000 (ou a definida em `PORT`) ocupada.

**Diagnóstico e solução (Windows)**:

1. Identificar o processo que ocupa a porta (substituir `3000` pela porta configurada, se diferente):

```bash
netstat -ano | findstr :3000
```

A última coluna da linha `LISTENING` é o identificador (PID) do processo.

2. Encerrar o processo:

```bash
taskkill /PID <PID> /F
```

Ou, no PowerShell:

```powershell
Get-Process -Id <PID> | Stop-Process -Force
```

3. Executar `npm run start:dev` novamente.

Alternativamente, definir temporariamente outra porta em `PORT`. O comando `taskkill /IM node.exe /F` encerra
**todos** os processos Node.js da máquina, e não apenas o do projeto, devendo ser usado com cautela.

---

## Frontend recebe `401` em todas as requisições

**Problema**: toda requisição à API retorna `401`, ou a aplicação retorna à tela de login repetidamente.

**Causas possíveis**, na ordem de verificação:

1. **Sessão expirada.** O access token expira em 8 horas; o cliente HTTP do frontend (`src/services/hub/client.ts`)
   renova a sessão automaticamente com o refresh token (válido por 30 dias) ao receber `401` e repete a requisição.
   Se a renovação falhar (refresh token expirado, revogado ou usuário desativado), a sessão é encerrada e a tela
   de login é exibida, comportamento esperado.
2. **`VITE_API_URL` apontando para outro backend.** Se o frontend estiver configurado para um endereço sem backend
   em execução, ou com outra instância (outra base de usuários), as chamadas autenticadas falham. Comparar o valor
   efetivo de `VITE_API_URL` (padrão `http://localhost:3000`) com a porta do backend (`03-execucao.md`).
3. **Backend reiniciado com outro `JWT_SECRET`.** Todos os tokens emitidos antes da troca tornam-se inválidos; as
   sessões abertas passam a receber `401` até novo login.

**Diagnóstico**: na aba de rede das ferramentas do desenvolvedor do navegador, a URL da requisição com `401`
indica o endereço efetivamente chamado (confirma ou descarta a causa 2). Se o login funciona e apenas as chamadas
seguintes falham, as causas 1 e 3 são mais prováveis.

**Solução**: novo login (causas 1 e 3); correção de `VITE_API_URL` e reinício de `npm run dev` (causa 2).

---

## Frontend em produção bloqueado por CORS

**Problema**: com o backend em produção (`NODE_ENV=production`), o navegador registra erro de CORS e nenhuma
requisição do frontend é concluída.

**Causa**: em produção, o CORS aceita apenas a origem de `FRONTEND_URL` e as de `CORS_ORIGINS`
(`src/common/cors.ts`). O registro de inicialização emite aviso quando nenhuma origem está configurada.

**Solução**: definir `FRONTEND_URL` com o endereço público do frontend (ou incluí-lo em `CORS_ORIGINS`) e
reiniciar o backend.

---

## Servidor do frontend não inicia no Windows

**Problema**: `node .output/server/index.mjs` é encerrado imediatamente, sem abrir porta.

**Causa**: o build padrão (`npm run build`) gera um Worker para a Cloudflare (preset `cloudflare-module` do Nitro),
que não constitui servidor Node.js.

**Solução**: compilar com o preset de servidor Node.js — no PowerShell, `$env:NITRO_PRESET="node-server"; npm run
build` — e executar `node .output/server/index.mjs` com `PORT` definido (ver `04-deploy.md`).
