#!/usr/bin/env bash
# Backup do Rooster One: banco + arquivos enviados.
#
# São as DUAS metades do estado. Só o dump do PostgreSQL não basta: anexo de
# chamado, documento acadêmico, certificado e nota fiscal são arquivos em
# disco, e o banco guarda apenas o nome do arquivo. Restaurar um sem o outro
# produz registro apontando para arquivo que não existe.
#
# As pastas de arquivos são resolvidas pela mesma regra da aplicação
# (scripts/pastas-upload.sh): pastas redirecionadas por variável de ambiente
# para outro disco (ex.: BOOST_VIDEOS_DIR) também entram no backup.
#
# Uso:
#   ./scripts/backup.sh [diretorio-destino]
#
# Requer DATABASE_URL no ambiente (ou em .env) e pg_dump no PATH.
# Com o docker compose deste repositório:
#   docker compose exec -T db pg_dump -U rooster rooster_one | gzip > banco.sql.gz

set -euo pipefail

DESTINO="${1:-./backups}"
CARIMBO="$(date +%Y%m%d-%H%M%S)"
PASTA="${DESTINO}/${CARIMBO}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=pastas-upload.sh
source "${RAIZ}/scripts/pastas-upload.sh"
carregar_env "${RAIZ}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERRO: DATABASE_URL não definida (nem no ambiente, nem em .env)." >&2
  exit 1
fi

# pg_dump/pg_restore usam libpq puro, que rejeita "?schema=..." (parâmetro só
# reconhecido pelo Prisma) com "invalid URI query parameter".
DATABASE_URL="${DATABASE_URL%%\?*}"

mkdir -p "${PASTA}"
echo "==> Backup em ${PASTA}"

# --- Banco ---
# --no-owner/--no-acl: o dump precisa poder ser restaurado num banco cujo
# usuário tem outro nome, que é o caso normal entre máquinas diferentes.
echo "--> Banco (pg_dump)"
pg_dump --no-owner --no-acl --format=custom --dbname="${DATABASE_URL}" --file="${PASTA}/banco.dump"

# --- Arquivos ---
# Cada tipo de arquivo é arquivado a partir da pasta onde a aplicação de fato o
# grava (inclusive pastas redirecionadas para outro disco), sob o nome canônico
# uploads/<subpasta>/ — o mesmo layout dos backups anteriores. O arquivo tar é
# montado por anexação (-r), porque --transform vale para a invocação inteira.
echo "--> Arquivos"
ARQUIVO_TAR="${PASTA}/uploads.tar"
tar -cf "${ARQUIVO_TAR}" --files-from /dev/null
RESUMO_PASTAS=""
while IFS=$'\t' read -r subpasta caminho; do
  if [[ -d "${caminho}" ]]; then
    total="$(find "${caminho}" -type f | wc -l | tr -d ' ')"
    tar -rf "${ARQUIVO_TAR}" --transform "s|^\.|uploads/${subpasta}|" -C "${caminho}" .
    echo "    ${subpasta}: ${total} arquivo(s)"
    RESUMO_PASTAS+="  ${subpasta}: ${total} arquivo(s) de ${caminho}"$'\n'
  else
    RESUMO_PASTAS+="  ${subpasta}: (inexistente) ${caminho}"$'\n'
  fi
done < <(resolver_pastas_upload "${RAIZ}")
gzip "${ARQUIVO_TAR}"

# --- Manifesto ---
# Registra o que foi salvo e de onde, para a restauração não depender de
# memória sobre qual dump corresponde a qual ambiente.
cat > "${PASTA}/manifesto.txt" <<EOF
Rooster One — backup
Data:        $(date --iso-8601=seconds)
Host:        $(hostname)
Banco:       $(echo "${DATABASE_URL}" | sed -E 's#(//[^:]+):[^@]+@#\1:***@#')
Migration:   $(ls -1 "${RAIZ}/prisma/migrations" 2>/dev/null | grep -E '^[0-9]' | tail -1)
Conteúdo:    banco.dump, uploads.tar.gz
Pastas de origem:
${RESUMO_PASTAS%$'\n'}
EOF

echo "==> Concluído:"
ls -la "${PASTA}"
echo
echo "Lembrete: um backup que nunca foi restaurado não é um backup."
echo "Teste a restauração com ./scripts/restore.sh ${PASTA} num banco descartável."
