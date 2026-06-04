#!/bin/sh

set -u

# Keep preflight CI-friendly: WARN does not fail the process, but any FAIL does.
EXIT_CODE=0
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

print_result() {
  status="$1"
  id="$2"
  title="$3"
  category="$4"
  summary="$5"
  details="$6"
  suggested_fix="${7:-}"

  case "$status" in
    PASS)
      PASS_COUNT=$((PASS_COUNT + 1))
      ;;
    WARN)
      WARN_COUNT=$((WARN_COUNT + 1))
      ;;
    FAIL)
      FAIL_COUNT=$((FAIL_COUNT + 1))
      EXIT_CODE=1
      ;;
  esac

  printf '[%s] %s\n' "$status" "$title"
  printf '  id: %s\n' "$id"
  printf '  category: %s\n' "$category"
  printf '  summary: %s\n' "$summary"
  printf '  details: %s\n' "$details"
  if [ -n "$suggested_fix" ]; then
    printf '  suggested_fix: %s\n' "$suggested_fix"
  fi
  printf '\n'
}

check_command() {
  command_name="$1"
  id="$2"
  title="$3"
  display_name="$4"

  if command -v "$command_name" >/dev/null 2>&1; then
    command_path=$(command -v "$command_name")
    print_result \
      "PASS" \
      "$id" \
      "$title" \
      "DEPENDENCY" \
      "$display_name is available on PATH." \
      "Resolved $command_name at $command_path."
    return 0
  fi

  print_result \
    "FAIL" \
    "$id" \
    "$title" \
    "DEPENDENCY" \
    "$display_name is not available on PATH." \
    "The preflight layer expected to find $command_name in PATH but could not resolve it." \
    "Install $display_name and ensure it is visible in PATH before rerunning diagnostics."
  return 1
}

printf 'IDOA preflight\n'
printf 'Track: Onboarding Diagnostics Lab\n'
printf 'Layer: preflight\n\n'

check_command "node" "preflight:node-available" "Node.js availability" "Node.js"
check_command "npm" "preflight:npm-available" "npm availability" "npm"

if [ -n "${PATH:-}" ]; then
  print_result \
    "PASS" \
    "preflight:path-visible" \
    "PATH readiness" \
    "ENVIRONMENT" \
    "PATH is set for the current shell session." \
    "PATH is non-empty and can be used for command resolution."
else
  print_result \
    "FAIL" \
    "preflight:path-visible" \
    "PATH readiness" \
    "ENVIRONMENT" \
    "PATH is empty or unset." \
    "A missing PATH prevents command resolution and makes onboarding failures hard to interpret." \
    "Set PATH in the active shell session before rerunning diagnostics."
fi

if command -v node >/dev/null 2>&1; then
  if node_version=$(node -v 2>/dev/null); then
    print_result \
      "PASS" \
      "preflight:node-version-visible" \
      "Node.js version visibility" \
      "ENVIRONMENT" \
      "Node.js reports a version." \
      "Detected $node_version from node -v."
  else
    print_result \
      "WARN" \
      "preflight:node-version-visible" \
      "Node.js version visibility" \
      "ENVIRONMENT" \
      "Node.js is available, but its version could not be read." \
      "The preflight layer could resolve node but node -v did not return a version."
  fi
fi

if command -v npm >/dev/null 2>&1; then
  if npm_version=$(npm -v 2>/dev/null); then
    print_result \
      "PASS" \
      "preflight:npm-version-visible" \
      "npm version visibility" \
      "ENVIRONMENT" \
      "npm reports a version." \
      "Detected $npm_version from npm -v."
  else
    print_result \
      "WARN" \
      "preflight:npm-version-visible" \
      "npm version visibility" \
      "ENVIRONMENT" \
      "npm is available, but its version could not be read." \
      "The preflight layer could resolve npm but npm -v did not return a version."
  fi
fi

if [ -w "." ]; then
  print_result \
    "PASS" \
    "preflight:working-directory-writable" \
    "Working directory writability" \
    "PERMISSIONS" \
    "Current working directory is writable." \
    "The preflight layer can write in the current directory."
else
  print_result \
    "WARN" \
    "preflight:working-directory-writable" \
    "Working directory writability" \
    "PERMISSIONS" \
    "Current working directory is not writable." \
    "Some onboarding workflows may need write access in the current directory."
fi

if [ -n "${SHELL:-}" ]; then
  print_result \
    "PASS" \
    "preflight:shell-visible" \
    "Shell visibility" \
    "ENVIRONMENT" \
    "SHELL is set for the current session." \
    "Detected SHELL as $SHELL."
else
  print_result \
    "WARN" \
    "preflight:shell-visible" \
    "Shell visibility" \
    "ENVIRONMENT" \
    "SHELL is not set for the current session." \
    "A missing SHELL value can make shell-specific onboarding failures harder to interpret."
fi

printf 'Summary: PASS=%s WARN=%s FAIL=%s\n' "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"

exit "$EXIT_CODE"
