#!/usr/bin/env bash
# =============================================================================
# CI Smoke Test Script for CRUSH Web
# =============================================================================
# Checks all critical endpoints, assets, redirects, and TLS on the deployed site.
#
# Usage:
#   ./scripts/smoke-test.sh [BASE_URL]
#
# Arguments:
#   BASE_URL  The deployed site URL (default: https://crush-web-chi.vercel.app)
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_URL="${1:-https://crush-web-chi.vercel.app}"
# Strip trailing slash if present
BASE_URL="${BASE_URL%/}"

CURL_TIMEOUT=15
CURL_MAX_TIME=30

PASS_COUNT=0
FAIL_COUNT=0

# ---------------------------------------------------------------------------
# Colors (disabled when stdout is not a terminal or NO_COLOR is set)
# ---------------------------------------------------------------------------
if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
  GREEN="\033[0;32m"
  RED="\033[0;31m"
  YELLOW="\033[0;33m"
  BOLD="\033[1m"
  RESET="\033[0m"
else
  GREEN=""
  RED=""
  YELLOW=""
  BOLD=""
  RESET=""
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf "  ${GREEN}PASS${RESET}  %s\n" "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf "  ${RED}FAIL${RESET}  %s\n" "$1"
}

header() {
  printf "\n${BOLD}%s${RESET}\n" "$1"
}

# ---------------------------------------------------------------------------
# check_status <path> <expected_status>
#   Fetches BASE_URL + path and asserts the HTTP status code matches.
#   For redirect checks (301/302), we do NOT follow redirects.
# ---------------------------------------------------------------------------
check_status() {
  local path="$1"
  local expected="$2"
  local url="${BASE_URL}${path}"
  local label="${path:-/}"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout "$CURL_TIMEOUT" \
    --max-time "$CURL_MAX_TIME" \
    --no-location \
    "$url" 2>/dev/null) || status="000"

  if [[ "$status" == "$expected" ]]; then
    pass "$label  (HTTP $status)"
  else
    fail "$label  (expected $expected, got $status)"
  fi
}

# ---------------------------------------------------------------------------
# check_redirect <path> <expected_location_substring>
#   Asserts the path returns 301 or 302 AND the Location header contains
#   the expected destination substring.
# ---------------------------------------------------------------------------
check_redirect() {
  local path="$1"
  local expected_dest="$2"
  local url="${BASE_URL}${path}"
  local label="${path} -> ${expected_dest}"

  local response
  response=$(curl -s -D - -o /dev/null \
    --connect-timeout "$CURL_TIMEOUT" \
    --max-time "$CURL_MAX_TIME" \
    --no-location \
    "$url" 2>/dev/null) || response=""

  local status
  status=$(echo "$response" | head -1 | grep -oE '[0-9]{3}' | head -1) || status="000"

  local location
  location=$(echo "$response" | grep -i '^location:' | sed 's/^[Ll]ocation:[[:space:]]*//' | tr -d '\r') || location=""

  if [[ "$status" == "301" || "$status" == "302" || "$status" == "307" || "$status" == "308" ]]; then
    if echo "$location" | grep -q "$expected_dest"; then
      pass "$label  (HTTP $status, Location: $location)"
    else
      fail "$label  (HTTP $status, but Location '$location' does not contain '$expected_dest')"
    fi
  else
    fail "$label  (expected redirect, got $status)"
  fi
}

# ---------------------------------------------------------------------------
# check_tls
#   Verifies TLS certificate is valid via curl --fail on the HTTPS URL.
# ---------------------------------------------------------------------------
check_tls() {
  local url="$BASE_URL"
  local label="TLS certificate validity"

  if [[ "$url" != https://* ]]; then
    fail "$label  (base URL is not HTTPS: $url)"
    return
  fi

  if curl -s --fail --head \
    --connect-timeout "$CURL_TIMEOUT" \
    --max-time "$CURL_MAX_TIME" \
    "$url" > /dev/null 2>&1; then
    pass "$label  ($url)"
  else
    fail "$label  ($url)"
  fi
}

# =============================================================================
# Run checks
# =============================================================================
printf "${BOLD}CRUSH Web Smoke Test${RESET}\n"
printf "Target: %s\n" "$BASE_URL"
printf "Date:   %s\n" "$(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# ---- TLS -------------------------------------------------------------------
header "TLS / HTTPS"
check_tls

# ---- Page routes (expect 200) ----------------------------------------------
header "Page Routes (expect HTTP 200)"
ROUTES=(
  "/"
  "/features"
  "/pricing"
  "/about"
  "/safety"
  "/guidelines"
  "/auth/login"
  "/auth/signup"
  "/privacy"
  "/terms"
  "/faq"
  "/help"
  "/contact"
  "/finishSignIn"
)
for route in "${ROUTES[@]}"; do
  check_status "$route" "200"
done

# ---- Static assets (expect 200) --------------------------------------------
header "Static Assets (expect HTTP 200)"
ASSETS=(
  "/manifest.json"
  "/favicon.svg"
  "/og-image.svg"
  "/robots.txt"
  "/sitemap.xml"
)
for asset in "${ASSETS[@]}"; do
  check_status "$asset" "200"
done

# ---- Redirects (expect 301 or 302) -----------------------------------------
header "Redirects (expect HTTP 301/302)"
check_redirect "/login"    "/auth/login"
check_redirect "/signup"   "/auth/signup"
check_redirect "/chat"     "/messages"
check_redirect "/download" "/#download"

# =============================================================================
# Summary
# =============================================================================
TOTAL=$((PASS_COUNT + FAIL_COUNT))
header "Summary"
printf "  Total:  %d\n" "$TOTAL"
printf "  ${GREEN}Passed: %d${RESET}\n" "$PASS_COUNT"
printf "  ${RED}Failed: %d${RESET}\n" "$FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  printf "\n${RED}${BOLD}SMOKE TEST FAILED${RESET} (%d failure(s))\n" "$FAIL_COUNT"
  exit 1
else
  printf "\n${GREEN}${BOLD}ALL SMOKE TESTS PASSED${RESET}\n"
  exit 0
fi
