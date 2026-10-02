# Resolução das pastas de arquivos enviados, com a mesma regra da aplicação
# (src/common/storage.config.ts): cada tipo de arquivo pode ser redirecionado
# por variável própria; sem ela, fica em <UPLOADS_DIR>/<subpasta>; sem
# UPLOADS_DIR, em <projeto>/uploads/<subpasta>. Caminho relativo é resolvido a
# partir da raiz do projeto, que é o diretório de trabalho esperado da aplicação.
#
# Carregado por backup.sh e restore.sh via `source`; não é executado
# diretamente. Qualquer nova pasta em storage.config.ts precisa ser incluída
# também em TIPOS_DE_UPLOAD, senão ficará fora do backup.

TIPOS_DE_UPLOAD=(
  "videos-boost:BOOST_VIDEOS_DIR"
  "materiais-boost:BOOST_MATERIAIS_DIR"
  "certificados-boost:BOOST_CERTIFICADOS_DIR"
  "anexos-tickets:DESK_ANEXOS_DIR"
  "anexos-entregas:LEARN_ANEXOS_DIR"
  "imagens-questoes:LEARN_IMAGENS_DIR"
  "documentos-academicos:ACADEMY_DOCUMENTOS_DIR"
  "notas-fiscais:FINANCE_NOTAS_DIR"
)

# Remove espaços no início e no fim.
aparar() {
  local valor="$1"
  valor="${valor#"${valor%%[![:space:]]*}"}"
  printf '%s' "${valor%"${valor##*[![:space:]]}"}"
}

caminho_configurado() {  # $1: valor configurado; $2: raiz do projeto
  case "$1" in
    /*) printf '%s' "$1" ;;
    *) printf '%s' "$2/$1" ;;
  esac
}

# Carrega .env sem sobrescrever variáveis já definidas no ambiente — mesmo
# comportamento da aplicação (dotenv).
carregar_env() {  # $1: raiz do projeto
  local arquivo="$1/.env" linha nome valor
  [[ -f "${arquivo}" ]] || return 0
  while IFS= read -r linha || [[ -n "${linha}" ]]; do
    linha="${linha%$'\r'}"
    [[ "${linha}" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]] || continue
    nome="${BASH_REMATCH[1]}"
    valor="$(aparar "${BASH_REMATCH[2]}")"
    valor="${valor%\"}"; valor="${valor#\"}"; valor="${valor%\'}"; valor="${valor#\'}"
    if [[ -z "${!nome:-}" ]]; then export "${nome}=${valor}"; fi
  done < "${arquivo}"
}

# Imprime uma linha "subpasta<TAB>caminho" para cada tipo de arquivo.
resolver_pastas_upload() {  # $1: raiz do projeto
  local raiz="$1" raiz_uploads valor tipo subpasta variavel especifica
  valor="$(aparar "${UPLOADS_DIR:-}")"
  if [[ -n "${valor}" ]]; then
    raiz_uploads="$(caminho_configurado "${valor}" "${raiz}")"
  else
    raiz_uploads="${raiz}/uploads"
  fi
  for tipo in "${TIPOS_DE_UPLOAD[@]}"; do
    subpasta="${tipo%%:*}"
    variavel="${tipo##*:}"
    especifica="$(aparar "${!variavel:-}")"
    if [[ -n "${especifica}" ]]; then
      printf '%s\t%s\n' "${subpasta}" "$(caminho_configurado "${especifica}" "${raiz}")"
    else
      printf '%s\t%s\n' "${subpasta}" "${raiz_uploads}/${subpasta}"
    fi
  done
}
