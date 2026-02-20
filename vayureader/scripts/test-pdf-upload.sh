#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/test-pdf-upload.sh \
    --pdf <path/to/file.pdf> \
    --title "PDF Title" \
    [--category "Category"] \
    [--content "Description"] \
    [--thumbnail <path/to/image>] \
    [--base-url https://localhost] \
    [--token <admin_jwt>] \
    [--cookie "admin_token=..."] \
    [--cookie-file <cookies.txt>] \
    [--strict-tls]

Notes:
- Endpoint tested: POST /api/pdfs/upload
- Auth required: admin with "manage_pdfs" permission.
- By default, script uses insecure TLS (-k) to support local self-signed certs.
USAGE
}

BASE_URL="https://localhost"
PDF_PATH=""
TITLE=""
CATEGORY="General"
CONTENT=""
THUMBNAIL_PATH=""
TOKEN=""
COOKIE_HEADER=""
COOKIE_FILE=""
INSECURE_TLS=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --pdf)
      PDF_PATH="$2"
      shift 2
      ;;
    --title)
      TITLE="$2"
      shift 2
      ;;
    --category)
      CATEGORY="$2"
      shift 2
      ;;
    --content)
      CONTENT="$2"
      shift 2
      ;;
    --thumbnail)
      THUMBNAIL_PATH="$2"
      shift 2
      ;;
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --cookie)
      COOKIE_HEADER="$2"
      shift 2
      ;;
    --cookie-file)
      COOKIE_FILE="$2"
      shift 2
      ;;
    --strict-tls)
      INSECURE_TLS=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$PDF_PATH" || -z "$TITLE" ]]; then
  echo "Error: --pdf and --title are required."
  usage
  exit 1
fi

if [[ ! -f "$PDF_PATH" ]]; then
  echo "Error: PDF file not found: $PDF_PATH"
  exit 1
fi

if [[ -n "$THUMBNAIL_PATH" && ! -f "$THUMBNAIL_PATH" ]]; then
  echo "Error: Thumbnail file not found: $THUMBNAIL_PATH"
  exit 1
fi

if [[ -z "$TOKEN" && -z "$COOKIE_HEADER" && -z "$COOKIE_FILE" ]]; then
  echo "Error: provide auth with --token, --cookie, or --cookie-file."
  exit 1
fi

ENDPOINT="${BASE_URL%/}/api/pdfs/upload"

curl_args=(
  -sS
  -X POST
  "$ENDPOINT"
  -H "Accept: application/json"
  -F "title=${TITLE}"
  -F "category=${CATEGORY}"
  -F "pdf=@${PDF_PATH};type=application/pdf"
)

if [[ -n "$CONTENT" ]]; then
  curl_args+=( -F "content=${CONTENT}" )
fi

if [[ -n "$THUMBNAIL_PATH" ]]; then
  curl_args+=( -F "thumbnail=@${THUMBNAIL_PATH}" )
fi

if [[ -n "$TOKEN" ]]; then
  curl_args+=( -H "Authorization: Bearer ${TOKEN}" )
fi

if [[ -n "$COOKIE_HEADER" ]]; then
  curl_args+=( -H "Cookie: ${COOKIE_HEADER}" )
fi

if [[ -n "$COOKIE_FILE" ]]; then
  curl_args+=( -b "$COOKIE_FILE" )
fi

if [[ "$INSECURE_TLS" -eq 1 ]]; then
  curl_args+=( -k )
fi

if [[ "$BASE_URL" == *"localhost"* || "$BASE_URL" == *"127.0.0.1"* ]]; then
  curl_args+=( --noproxy "*" )
fi

response="$(curl "${curl_args[@]}" -w $'\nHTTP_STATUS:%{http_code}\n')"
http_status="$(printf '%s\n' "$response" | sed -n 's/^HTTP_STATUS://p' | tail -n1)"
body="$(printf '%s\n' "$response" | sed '/^HTTP_STATUS:/d')"

printf 'Endpoint: %s\n' "$ENDPOINT"
printf 'HTTP Status: %s\n' "$http_status"
printf 'Response:\n%s\n' "$body"

if [[ "$http_status" =~ ^2[0-9][0-9]$ ]]; then
  echo "\nPASS: PDF upload request succeeded."
  exit 0
fi

echo "\nFAIL: Upload request failed."
exit 1
