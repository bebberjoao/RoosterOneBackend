#!/usr/bin/env bash
# Backup do Rooster One: banco + arquivos enviados.
#
# São as DUAS metades do estado. Só o dump do PostgreSQL não basta: anexo de
# chamado, documento acadêmico, certificado e nota fiscal são arquivos em
# uploads/, e o banco guarda apenas o caminho. Restaurar um sem o outro
# produz registro apontando para arquivo que não existe.
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

# Carrega .env se DATABASE_URL não veio do ambiente.
if [[ -z "${DATABASE_URL:-}" && -f "${RAIZ}/.env" ]]; then
  set -a; . "${RAIZ}/.env"; set +a
fi

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
if [[ -d "${RAIZ}/uploads" ]]; then
  echo "--> Arquivos (uploads/)"
  tar -czf "${PASTA}/uploads.tar.gz" -C "${RAIZ}" uploads
else
  echo "--> uploads/ não existe ainda; nada a arquivar"
fi

# --- Manifesto ---
# Registra o que foi salvo e de onde, para a restauração não depender de
# memória sobre qual dump corresponde a qual ambiente.
cat > "${PASTA}/manifesto.txt" <<EOF
Rooster One — backup
Data:        $(date --iso-8601=seconds)
Host:        $(hostname)
Banco:       $(echo "${DATABASE_URL}" | sed -E 's#(//[^:]+):[^@]+@#\1:***@#')
Migration:   $(ls -1 "${RAIZ}/prisma/migrations" 2>/dev/null | grep -E '^[0-9]' | tail -1)
Conteúdo:    banco.dump$( [[ -f "${PASTA}/uploads.tar.gz" ]] && echo ", uploads.tar.gz" )
EOF

echo "==> Concluído:"
ls -la "${PASTA}"
echo
echo "Lembrete: um backup que nunca foi restaurado não é um backup."
echo "Teste a restauração com ./scripts/restore.sh ${PASTA} num banco descartável."
