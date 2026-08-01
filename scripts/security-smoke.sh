#!/bin/sh
set -eu

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$repo_root"

echo "Running security smoke checks..."

fail=0

check_absent() {
  pattern="$1"
  label="$2"
  if grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude=security-smoke.sh -- "$pattern" app >/tmp/security_check_match.txt 2>/dev/null; then
    echo "FAIL: found forbidden pattern: $label"
    cat /tmp/security_check_match.txt
    fail=1
  else
    echo "PASS: $label"
  fi
}

check_repo_absent() {
  pattern="$1"
  label="$2"
  if grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude=security-smoke.sh -- "$pattern" . >/tmp/security_check_match.txt 2>/dev/null; then
    echo "FAIL: found forbidden pattern: $label"
    cat /tmp/security_check_match.txt
    fail=1
  else
    echo "PASS: $label"
  fi
}

check_present() {
  pattern="$1"
  label="$2"
  if grep -REIn --exclude-dir=.git -- "$pattern" app >/tmp/security_check_match.txt 2>/dev/null; then
    echo "PASS: $label"
  else
    echo "FAIL: expected pattern not found: $label"
    fail=1
  fi
}

check_present_fixed() {
  pattern="$1"
  label="$2"
  if grep -RInF --exclude-dir=.git -- "$pattern" app >/tmp/security_check_match.txt 2>/dev/null; then
    echo "PASS: $label"
  else
    echo "FAIL: expected pattern not found: $label"
    fail=1
  fi
}

check_frontend_key_present() {
  pattern="$1"
  label="$2"
  bootstrap_file="app/js/core/bootstrap.js"

  if [ -f "$bootstrap_file" ] && grep -InF -- "$pattern" "$bootstrap_file" >/tmp/security_check_match.txt 2>/dev/null; then
    echo "PASS: $label"
  elif grep -RInF --exclude-dir=.git -- "$pattern" app >/tmp/security_check_match.txt 2>/dev/null; then
    echo "PASS: $label"
  else
    echo "FAIL: expected pattern not found: $label"
    fail=1
  fi
}

check_absent "SUPABASE_SERVICE_ROLE_KEY" "service role env var not committed in app code"
check_absent "service_role" "service role token string not committed in app code"
check_repo_absent "postgres://.*:.*@" "raw database credentials not committed"
check_repo_absent "-----BEGIN PRIVATE KEY-----" "private keys not committed"
check_frontend_key_present "SUPA_KEY" "frontend defines a public Supabase key variable"
check_frontend_key_present "sb_publishable_" "frontend uses a publishable Supabase key"

rm -f /tmp/security_check_match.txt

if [ "$fail" -ne 0 ]; then
  echo "Security smoke checks failed."
  exit 1
fi

echo "Security smoke checks passed."
