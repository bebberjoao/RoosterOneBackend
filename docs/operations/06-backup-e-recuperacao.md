# Backup e Recuperação

Status: setembro/2026. Existem **scripts de backup e restauração**; não existe **agendamento automático**, porque agendar depende de um ambiente que rode continuamente — e não há produção ainda.

## O que precisa ser salvo: duas metades

O estado do Rooster One não cabe só no banco. Anexo de chamado, documento acadêmico, material do Boost, certificado e nota fiscal são **arquivos em `uploads/`**, e o banco guarda apenas o caminho até eles.

Restaurar uma metade sem a outra produz um sistema que parece íntegro e não é: registro apontando para arquivo inexistente (download quebrado) ou arquivo órfão que ninguém alcança. Por isso os scripts tratam as duas juntas, sempre.

## Scripts

Há **duas versões equivalentes**, porque o servidor de implantação é Windows e o script bash exigiria Git Bash ou WSL instalados só para isso:

| Script | Ambiente | O que faz |
|---|---|---|
| `scripts/backup.ps1` | **Windows (oficial)** | `pg_dump` custom + `uploads.zip` + manifesto, em pasta carimbada |
| `scripts/restore.ps1` | **Windows (oficial)** | `pg_restore` + restauração de `uploads/`, com confirmação |
| `scripts/backup.sh` | Linux/macOS | Mesmo conteúdo, com `tar.gz` no lugar do zip |
| `scripts/restore.sh` | Linux/macOS | Idem |

Todos leem `DATABASE_URL` do ambiente ou do `.env`, e falham de forma clara se ela não existir. As versões Windows também verificam se `pg_dump`/`pg_restore` estão no `PATH` — a pasta `bin` do PostgreSQL (tipicamente `C:\Program Files\PostgreSQL\16\bin`) precisa estar lá.

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

## O que ainda falta

- **Agendamento**: nenhum. No servidor Windows, isto seria uma tarefa diária no Agendador de Tarefas chamando `backup.ps1`, enviando o resultado para armazenamento externo:

  ```powershell
  schtasks /create /tn "RoosterOne-Backup" /sc daily /st 03:00 ^
    /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\rooster\backend\scripts\backup.ps1 -Destino D:\backups-rooster"
  ```
- **Armazenamento externo**: os scripts gravam em disco local. Backup que vive na mesma máquina que o banco não protege contra a perda da máquina.
- **Retenção**: não há expurgo de backup antigo; hoje a pasta cresce indefinidamente.
- **Teste de restauração periódico**: o procedimento existe e é executável, mas não roda de forma programada contra um banco descartável.

Os quatro dependem de um ambiente que rode continuamente, e estão registrados no Índice de Pendências.

## Verificação pós-restauração

Um `pg_restore` sem erro não significa sistema íntegro. Conferir:

1. `GET /health` responde `200` — o banco está alcançável pela aplicação (e não só pelo `psql`).
2. Login funciona e uma listagem qualquer traz dados.
3. **Um anexo ou certificado antigo abre** — é o que prova que banco e `uploads/` foram restaurados em sincronia, a falha mais provável e menos visível.

## Recuperação de desastre

Não há plano formal de DR (RTO/RPO definidos, ambiente de contingência, procedimento ensaiado), porque não há produção. O que existe é o material para construí-lo: os scripts acima, o procedimento de mudança de schema em `docs/engineering/13-governanca.md` e o registro de riscos R-02/R-03, que tratam justamente da ausência de backup e de volume persistente.
