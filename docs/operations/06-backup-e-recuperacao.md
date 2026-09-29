# Backup e Recuperação

Status: setembro/2026. Existem **scripts de backup e restauração**; não existe **agendamento automático**, porque agendar depende de um ambiente que rode continuamente — e não há produção ainda.

## O que precisa ser salvo: duas metades

O estado do Rooster One não cabe só no banco. Anexo de chamado, documento acadêmico, material do Boost, certificado e nota fiscal são **arquivos em `uploads/`**, e o banco guarda apenas o caminho até eles.

Restaurar uma metade sem a outra produz um sistema que parece íntegro e não é: registro apontando para arquivo inexistente (download quebrado) ou arquivo órfão que ninguém alcança. Por isso os scripts tratam as duas juntas, sempre.

**Desde setembro/2026, na prática são três peças, não duas.** Todo arquivo em `uploads/` é gravado cifrado em repouso (`FILE_ENCRYPTION_KEY`, ver `docs/security/05-analise-de-seguranca.md`) — restaurar banco e `uploads/` sem a mesma chave que cifrou aqueles arquivos produz exatamente o mesmo sintoma de "parece íntegro e não é": os registros existem, os arquivos existem, mas nenhum deles abre (a API responde erro ao tentar decifrar). `FILE_ENCRYPTION_KEY` não é backup automático dos scripts abaixo — é uma variável de ambiente do servidor, e **precisa ser guardada e restaurada com o mesmo cuidado que o próprio banco**. Perdê-la, ou restaurar `uploads/` contra uma chave diferente da que gravou os arquivos, torna todo o conteúdo permanentemente ilegível — não há como recuperar sem a chave original, por design.

## Scripts

Há **duas versões equivalentes**, porque o servidor de implantação é Windows e o script bash exigiria Git Bash ou WSL instalados só para isso:

| Script | Ambiente | O que faz |
|---|---|---|
| `scripts/backup.ps1` | **Windows (oficial)** | `pg_dump` custom + `uploads.zip` + manifesto, em pasta carimbada |
| `scripts/restore.ps1` | **Windows (oficial)** | `pg_restore` + restauração de `uploads/`, com confirmação |
| `scripts/recovery-drill.ps1` | **Windows** | Simulado de recuperação — ver seção própria abaixo |
| `scripts/backup.sh` | Linux/macOS | Mesmo conteúdo, com `tar.gz` no lugar do zip |
| `scripts/restore.sh` | Linux/macOS | Idem |

Todos leem `DATABASE_URL` do ambiente ou do `.env`, e falham de forma clara se ela não existir. As versões Windows também verificam se `pg_dump`/`pg_restore`/`createdb`/`dropdb`/`psql` estão no `PATH` — a pasta `bin` do PostgreSQL (tipicamente `C:\Program Files\PostgreSQL\16\bin` ou a versão instalada) precisa estar lá.

`pg_dump`/`pg_restore` usam libpq puro e **não aceitam** o parâmetro `?schema=...` que o Prisma acrescenta ao `DATABASE_URL` do projeto (falha com "parâmetro da consulta de URI inválido"/"invalid URI query parameter"). Os quatro scripts de backup/restauração removem essa query string antes de repassar a URL — achado e corrigido ao validar `recovery-drill.ps1` contra um backup de verdade (setembro/2026).

```powershell
# Windows
.\scripts\backup.ps1                          # grava em .\backups\AAAAMMDD-HHMMSS
.\scripts\backup.ps1 -Destino D:\backups-rooster

.\scripts\restore.ps1 -Pasta .\backups\20260924-084500
.\scripts\restore.ps1 -Pasta .\backups\20260924-084500 -Confirmar   # sem prompt
```

```bash
# Linux/macOS
./scripts/backup.sh
./scripts/restore.sh ./backups/20260923-140000
CONFIRMAR=sim ./scripts/restore.sh ./backups/20260923-140000
```

Decisões embutidas nos scripts, que importam na hora de restaurar em outra máquina:

- **`--no-owner --no-acl`** no dump: permite restaurar num banco cujo usuário tem outro nome — o caso normal entre ambientes.
- **`--clean --if-exists`** na restauração: derruba os objetos antes de recriar, para funcionar num banco que já tem schema.
- **Confirmação explícita** na restauração: ela sobrescreve banco e arquivos. É uma das poucas operações genuinamente irreversíveis do sistema, e restaurar no banco errado é um erro fácil de cometer e impossível de desfazer.
- **Manifesto** em cada backup, registrando data, host, banco (com a senha mascarada) e a última migration aplicada — para a restauração não depender de memória sobre qual dump corresponde a qual ambiente.

Com o `docker-compose.yml`, o dump também pode sair direto do container:

```bash
docker compose exec -T db pg_dump -U rooster rooster_one | gzip > banco.sql.gz
```

## Simulado de recuperação (`scripts/recovery-drill.ps1`)

"Um backup que nunca foi restaurado não é um backup de verdade" — mas `restore.ps1` sobrescreve dados
reais e exige confirmação, então na prática só roda numa emergência real. `recovery-drill.ps1` existe pra
provar rotineiramente que os backups gerados são restauráveis, sem esse risco:

1. Restaura o `banco.dump` de uma pasta de backup num banco Postgres **descartável** (`rooster_drill_<carimbo>`, criado com `createdb`, nunca o banco de `DATABASE_URL`).
2. Confere que as tabelas centrais de módulos independentes vieram populadas (`usuarios`, `permissoes`, `logs_auditoria`, `tickets`, `reservas`, `cobrancas`).
3. Se o backup tem `uploads.zip`, extrai numa pasta temporária e confere que um arquivo referenciado no banco restaurado (um anexo de chamado) existe de fato ali — a mesma verificação de sincronia banco/arquivo da seção abaixo, só que automática. **Limitação conhecida**: essa checagem confere só que o arquivo existe, não que ele decifra com o `FILE_ENCRYPTION_KEY` atual (item pendente — ver `docs/engineering/10-melhorias-futuras.md`).
4. Limpa tudo ao final (`dropdb` + remove a pasta temporária), mesmo se algo falhar no meio (`try/finally`). `-ManterBanco` pula a limpeza do banco, para inspecionar manualmente depois de uma falha.

Sai com código de saída `1` se qualquer verificação falhar — dá para usar como *gate* de CI/agendador, não só rodar manualmente.

```powershell
.\scripts\recovery-drill.ps1 -Pasta .\backups\20260928-090000
.\scripts\recovery-drill.ps1 -Pasta .\backups\20260928-090000 -ManterBanco
```

## O que ainda falta

- **Agendamento**: nenhum. No servidor Windows, isto seria uma tarefa diária no Agendador de Tarefas chamando `backup.ps1` (e, semanalmente, `recovery-drill.ps1` contra o backup mais recente), enviando o resultado para armazenamento externo:

  ```powershell
  schtasks /create /tn "RoosterOne-Backup" /sc daily /st 03:00 ^
    /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\rooster\backend\scripts\backup.ps1 -Destino D:\backups-rooster"
  ```
- **Armazenamento externo**: os scripts gravam em disco local. Backup que vive na mesma máquina que o banco não protege contra a perda da máquina.
- **Retenção**: não há expurgo de backup antigo; hoje a pasta cresce indefinidamente.

Os três dependem de um ambiente que rode continuamente, e estão registrados no Índice de Pendências. O
teste de restauração em si (antes "existe mas não roda programado") passou a ter o script pronto pra ser
agendado — falta só o agendamento de verdade, junto com o do backup.

## Verificação pós-restauração

Um `pg_restore` sem erro não significa sistema íntegro. Conferir:

1. `GET /health` responde `200` — o banco está alcançável pela aplicação (e não só pelo `psql`).
2. Login funciona e uma listagem qualquer traz dados.
3. **Um anexo ou certificado antigo abre** — é o que prova que banco, `uploads/` **e** `FILE_ENCRYPTION_KEY` foram restaurados em sincronia; abre a página mas o download falha é o sintoma exato de banco/arquivo certos com a chave errada.

## Recuperação de desastre

Não há plano formal de DR (RTO/RPO definidos, ambiente de contingência, procedimento ensaiado), porque não há produção. O que existe é o material para construí-lo: os scripts acima, o procedimento de mudança de schema em `docs/engineering/13-governanca.md` e o registro de riscos R-02/R-03, que tratam justamente da ausência de backup e de volume persistente.
