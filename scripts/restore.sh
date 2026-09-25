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

if [[ -z "${DATABASE_URL:-}" && -f "${RAIZ}/.env" ]]; then
  set -a; . "${RAIZ}/.env"; set +a
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERRO: DATABASE_URL não definida." >&2
  exit 1
fi

ALVO="$(echo "${DATABASE_URL}" | sed -E 's#(//[^:]+):[^@]+@#\1:***@#')"
echo "Backup:  ${PASTA}"
[[ -f "${PASTA}/manifesto.txt" ]] && { echo; cat "${PASTA}/manifesto.txt"; echo; }
echo "DESTINO: ${ALVO}"
echo
echo "Isto APAGA os dados atuais desse banco e de uploads/."

if [[ "${CONFIRMAR:-}" != "sim" ]]; then
  read -r -p "Digite 'restaurar' para continuar: " resposta
  [[ "${resposta}" == "restaurar" ]] || { echo "Cancelado."; exit 1; }
fi

# --clean --if-exists: derruba os objetos antes de recriar, para a restauração
# funcionar num banco que já tem schema — o caso comum.
echo "--> Restaurando banco"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="${DATABASE_URL}" "${PASTA}/banco.dump"

if [[ -f "${PASTA}/uploads.tar.gz" ]]; then
  echo "--> Restaurando uploads/"
  rm -rf "${RAIZ}/uploads"
  tar -xzf "${PASTA}/uploads.tar.gz" -C "${RAIZ}"
else
  echo "--> Backup não tinha uploads.tar.gz; uploads/ mantido como está"
fi

echo
echo "==> Restauração concluída."
echo "Confira antes de considerar o sistema no ar:"
echo "  - GET /health responde 200 (banco alcançável)"
echo "  - um anexo/certificado antigo ainda abre (arquivo e registro em sincronia)"
