# Backup e Recuperação

Situação em 30/09/2026: existem **scripts de backup, de restauração e de simulado de recuperação**,
validados de ponta a ponta contra o banco de desenvolvimento; não existe **agendamento automático**, que
depende de um ambiente em execução contínua, ainda inexistente.

## Componentes do estado do sistema

O estado do Rooster One não se limita ao banco de dados. Anexos de chamado, documentos acadêmicos, anexos de
entrega, materiais e vídeos do Boost, certificados e notas fiscais são **arquivos em disco**, e o banco
armazena apenas o nome de cada arquivo.

A restauração de uma parte sem a outra produz um sistema aparentemente íntegro, porém inconsistente:
registros que apontam para arquivos inexistentes (download com falha) ou arquivos órfãos, inacessíveis pela
aplicação. Por essa razão, os scripts tratam as duas partes em conjunto.

**Há ainda um terceiro componente: a chave de criptografia.** Desde setembro/2026, todo arquivo é gravado
cifrado (`FILE_ENCRYPTION_KEY`; ver `docs/security/05-analise-de-seguranca.md`). A restauração de banco e
arquivos sem a mesma chave que os cifrou produz o mesmo sintoma de inconsistência: registros e arquivos
existem, mas nenhum arquivo pode ser aberto. A chave não é incluída nos backups — é variável de ambiente do
servidor — e **deve ser guardada e restaurada com o mesmo cuidado do banco de dados**. Sua perda torna todo o
conteúdo permanentemente ilegível; não há recuperação possível sem a chave original.

## Scripts

Há **duas versões equivalentes**, pois o servidor de implantação é Windows e a versão bash exigiria Git Bash
ou WSL apenas para esse fim:

| Script | Ambiente | Função |
|---|---|---|
| `scripts/backup.ps1` | **Windows (oficial)** | `pg_dump` em formato custom, arquivo `uploads.zip` e manifesto, em pasta nomeada pela data e hora |
| `scripts/restore.ps1` | **Windows (oficial)** | `pg_restore` e restauração dos arquivos, com confirmação |
| `scripts/recovery-drill.ps1` | **Windows** | Simulado de recuperação (seção própria abaixo) |
| `scripts/backup.sh` | Linux e macOS | Mesma função, com `uploads.tar.gz` no lugar do arquivo zip |
| `scripts/restore.sh` | Linux e macOS | Mesma função |

Todos leem `DATABASE_URL` do ambiente ou do `.env` (sem sobrescrever variáveis já definidas no ambiente) e
falham com mensagem clara na ausência dela. As versões Windows verificam a disponibilidade de `pg_dump`,
`pg_restore`, `createdb`, `dropdb` e `psql` no `PATH`; a pasta `bin` do PostgreSQL (por exemplo,
`C:\Program Files\PostgreSQL\18\bin`, conforme a versão instalada) deve constar do `PATH`.

`pg_dump` e `pg_restore` utilizam a biblioteca libpq, que **não aceita** o parâmetro `?schema=...`
acrescentado pelo Prisma ao `DATABASE_URL` ("parâmetro da consulta de URI inválido"). Os scripts removem esse
parâmetro antes de repassar a URL.

### Pastas de arquivos redirecionadas

Cada tipo de arquivo pode ser armazenado em pasta própria, definida por variável de ambiente
(`UPLOADS_DIR`, `BOOST_VIDEOS_DIR`, `DESK_ANEXOS_DIR` etc.; ver `docs/operations/01-configuracao.md`). Os
scripts resolvem cada pasta pela mesma regra da aplicação (`scripts/pastas-upload.ps1` e
`scripts/pastas-upload.sh`) e gravam todas no mesmo arquivo compactado, sob o nome canônico
`uploads/<subpasta>/`. Consequências:

- **Pastas redirecionadas para outro disco entram no backup.** Até 30/09/2026, apenas `<projeto>/uploads`
  era arquivado, e uma pasta de vídeos em disco separado — configuração recomendada para instituições que
  hospedam vídeos — ficava fora do backup sem aviso.
- **A restauração independe da disposição do servidor de origem.** Cada `uploads/<subpasta>/` é restaurada
  na pasta configurada para aquele tipo de arquivo no servidor de destino, que pode diferir da origem.
- **Backups anteriores permanecem restauráveis.** O formato canônico coincide com o dos backups antigos; a
  versão PowerShell também aceita o separador `\` gravado pelo `Compress-Archive` do Windows PowerShell 5.1.
- O arquivo zip é gerado pela API `ZipArchive` do .NET, com separador `/` conforme a especificação ZIP e sem
  o limite de 2 GB por arquivo do `Compress-Archive` do Windows PowerShell 5.1.
- A restauração recusa entradas cujo caminho escape da pasta de destino (por exemplo, com `..`).
- O manifesto registra a pasta de origem e a quantidade de arquivos de cada tipo.

```powershell
# Windows
.\scripts\backup.ps1                          # grava em .\backups\AAAAMMDD-HHMMSS
.\scripts\backup.ps1 -Destino D:\backups-rooster

.\scripts\restore.ps1 -Pasta .\backups\20260924-084500
.\scripts\restore.ps1 -Pasta .\backups\20260924-084500 -Confirmar   # sem solicitação de confirmação
```

```bash
# Linux e macOS
./scripts/backup.sh
./scripts/restore.sh ./backups/20260923-140000
CONFIRMAR=sim ./scripts/restore.sh ./backups/20260923-140000
```

A pasta padrão de destino (`./backups`) consta do `.gitignore`, pois contém dump do banco com dados pessoais e
hashes de senha. Em produção, recomenda-se destino fora da pasta da aplicação.

Decisões incorporadas aos scripts, relevantes para a restauração em outra máquina:

- **`--no-owner --no-acl`** no dump: permite a restauração em banco cujo usuário tenha outro nome, situação
  comum entre ambientes.
- **`--clean --if-exists`** na restauração: remove os objetos antes de recriá-los, para funcionar em banco que
  já possua esquema.
- **Confirmação explícita** na restauração: a operação sobrescreve banco e arquivos, é irreversível, e a
  restauração no banco incorreto é um erro de fácil ocorrência.
- **Manifesto** em cada backup, com data, servidor, banco (senha mascarada), última migration aplicada e
  pastas de origem dos arquivos, para que a correspondência entre backup e ambiente não dependa de memória.

Com o `docker-compose.yml`, o dump também pode ser obtido diretamente do container:

```bash
docker compose exec -T db pg_dump -U rooster rooster_one | gzip > banco.sql.gz
```

## Simulado de recuperação (`scripts/recovery-drill.ps1`)

Um backup cuja restauração nunca foi testada não tem sua recuperabilidade comprovada. Como `restore.ps1`
sobrescreve dados reais e exige confirmação, é executado apenas em emergência; `recovery-drill.ps1` comprova
rotineiramente, sem esse risco, que os backups gerados são restauráveis:

1. Restaura o `banco.dump` de uma pasta de backup em banco PostgreSQL **descartável**
   (`rooster_drill_<data e hora>`, criado com `createdb`), nunca no banco de `DATABASE_URL`.
2. Confere que as tabelas centrais de módulos independentes foram restauradas (`usuarios`, `permissoes`,
   `logs_auditoria`, `tickets`, `reservas`, `cobrancas`).
3. Se o backup contém `uploads.zip`, extrai o conteúdo em pasta temporária e confere que o arquivo do anexo de
   chamado mais recente registrado no banco restaurado existe no backup.
4. **Desde 30/09/2026**, confere que esse arquivo é decifrável com a `FILE_ENCRYPTION_KEY` configurada, por
   meio de `scripts/verificar-arquivo-cifrado.js`, que utiliza a própria implementação de decifragem da
   aplicação (requer o build em `dist/`). Um backup íntegro com a chave incorreta é, na prática,
   irrecuperável; esta etapa torna essa situação detectável antes de uma emergência.
5. Remove tudo o que criou ao final (`dropdb` e pasta temporária), inclusive em caso de falha intermediária
   (`try/finally`). O parâmetro `-ManterBanco` preserva o banco para inspeção manual.

O script encerra com código de saída `1` se qualquer verificação falhar, o que permite seu uso como etapa de
agendamento ou de CI, e não apenas em execução manual. Na revisão de 30/09/2026 foi corrigida uma
incompatibilidade com o Windows PowerShell 5.1 (uso de `Join-Path` com vários segmentos, recurso do
PowerShell 7) que impedia a conclusão do simulado sempre que havia anexo a verificar; o simulado completo foi
então executado com sucesso contra um backup real.

```powershell
.\scripts\recovery-drill.ps1 -Pasta .\backups\20260928-090000
.\scripts\recovery-drill.ps1 -Pasta .\backups\20260928-090000 -ManterBanco
```

## Pendências

- **Agendamento**: inexistente. No servidor Windows, corresponde a uma tarefa diária no Agendador de Tarefas
  executando `backup.ps1` (e, semanalmente, `recovery-drill.ps1` sobre o backup mais recente), com envio do
  resultado a armazenamento externo:

  ```powershell
  schtasks /create /tn "RoosterOne-Backup" /sc daily /st 03:00 ^
    /tr "powershell -NoProfile -ExecutionPolicy Bypass -File C:\rooster\backend\scripts\backup.ps1 -Destino D:\backups-rooster"
  ```
- **Armazenamento externo**: os scripts gravam em disco local; backup armazenado na mesma máquina do banco não
  protege contra a perda da máquina.
- **Retenção**: não há remoção de backups antigos; a pasta de destino cresce indefinidamente.

As três pendências dependem de ambiente em execução contínua e constam do Índice de Pendências.

## Verificação pós-restauração

A conclusão do `pg_restore` sem erro não garante a integridade do sistema. Verificar:

1. `GET /health` responde `200`, isto é, o banco está acessível pela aplicação.
2. O login funciona e uma listagem retorna dados.
3. **Um anexo ou certificado antigo pode ser aberto.** Essa verificação comprova que banco, arquivos e
   `FILE_ENCRYPTION_KEY` foram restaurados em sincronia; página carregada com download em falha é o sintoma de
   banco e arquivos corretos com chave incorreta.

## Recuperação de desastre

Não há plano formal de recuperação de desastre (RTO e RPO definidos, ambiente de contingência, procedimento
ensaiado), por inexistir produção. Estão disponíveis os elementos para sua construção: os scripts acima, o
procedimento de mudança de esquema em `docs/engineering/13-governanca.md` e os riscos R-02 e R-03 do registro de
riscos, que tratam da ausência de backup e de volume persistente.
