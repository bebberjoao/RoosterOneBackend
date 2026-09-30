#!/usr/bin/env bash
# Restauração do Rooster One a partir de um backup gerado por backup.sh.
#
# ATENÇÃO: sobrescreve o banco apontado por DATABASE_URL e o conteúdo de
# uploads/. Por isso exige confirmação explícita — restaurar no banco errado
# é uma das poucas operações genuinamente irreversíveis deste sistema.
#
# Uso:
#   ./scripts/restore.sh ./backups/20260923-140000
#   CONFIRMAR=sim ./scripts/restore.sh ./backups/20260923-140000   # sem prompt

set -euo pipefail

PASTA="${1:-}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${PASTA}" || ! -d "${PASTA}" ]]; then
  echo "Uso: $0 <pasta-do-backup>" >&2
  exit 1
fi
if [[ ! -f "${PASTA}/banco.dump" ]]; then
  echo "ERRO: ${PASTA}/banco.dump não encontrado." >&2
  exit 1
fi

# shellcheck source=pastas-upload.sh
source "${RAIZ}/scripts/pastas-upload.sh"
carregar_env "${RAIZ}"
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERRO: DATABASE_URL não definida." >&2
  exit 1
fi

# pg_dump/pg_restore usam libpq puro, que rejeita "?schema=..." (parâmetro só
# reconhecido pelo Prisma) com "invalid URI query parameter".
DATABASE_URL="${DATABASE_URL%%\?*}"

ALVO="$(echo "${DATABASE_URL}" | sed -E 's#(//[^:]+):[^@]+@#\1:***@#')"
echo "Backup:  ${PASTA}"
[[ -f "${PASTA}/manifesto.txt" ]] && { echo; cat "${PASTA}/manifesto.txt"; echo; }
echo "DESTINO: ${ALVO}"
echo
echo "Isto APAGA os dados atuais desse banco e das pastas de arquivos:"
resolver_pastas_upload "${RAIZ}" | cut -f2 | sed 's/^/  /'

if [[ "${CONFIRMAR:-}" != "sim" ]]; then
  read -r -p "Digite 'restaurar' para continuar: " resposta
  [[ "${resposta}" == "restaurar" ]] || { echo "Cancelado."; exit 1; }
fi

# --clean --if-exists: derruba os objetos antes de recriar, para a restauração
# funcionar num banco que já tem schema — o caso comum.
echo "--> Restaurando banco"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="${DATABASE_URL}" "${PASTA}/banco.dump"

if [[ -f "${PASTA}/uploads.tar.gz" ]]; then
  # Cada uploads/<subpasta>/ do arquivo volta para a pasta onde a aplicação
  # deste servidor grava aquele tipo de arquivo — que pode diferir da pasta do
  # servidor de origem, se houver redirecionamento por variável. Backups
  # anteriores usam o mesmo layout, portanto continuam restauráveis.
  echo "--> Restaurando arquivos"
  MEMBROS="$(tar -tzf "${PASTA}/uploads.tar.gz")"
  while IFS=$'\t' read -r subpasta caminho; do
    mkdir -p "${caminho}"
    find "${caminho}" -mindepth 1 -delete
    if grep -q "^uploads/${subpasta}/." <<< "${MEMBROS}"; then
      tar -xzf "${PASTA}/uploads.tar.gz" -C "${caminho}" --strip-components=2 --wildcards "uploads/${subpasta}/*"
      echo "    ${subpasta}: $(find "${caminho}" -type f | wc -l | tr -d ' ') arquivo(s)"
    fi
  done < <(resolver_pastas_upload "${RAIZ}")
else
  echo "--> Backup não tinha uploads.tar.gz; pastas de arquivos mantidas como estão"
fi

echo
echo "==> Restauração concluída."
echo "Confira antes de considerar o sistema no ar:"
echo "  - GET /health responde 200 (banco alcançável)"
echo "  - um anexo/certificado antigo ainda abre (arquivo e registro em sincronia)"
