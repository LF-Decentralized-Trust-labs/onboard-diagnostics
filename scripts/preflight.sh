#!/bin/sh

set -u

# Keep preflight CI-friendly: WARN does not fail the process, but any FAIL does.
EXIT_CODE=0
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

print_result() {
  result_status="$1"
  id="$2"
  title="$3"
  category="$4"
  summary="$5"
  details="$6"
  suggested_fix="${7:-}"

  case "$result_status" in
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

  printf '[%s] %s\n' "$result_status" "$title"
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

check_path() {
  if [ -z "${PATH:-}" ]; then
    print_result \
      "FAIL" \
      "preflight:path-sane" \
      "PATH sanity" \
      "ENVIRONMENT" \
      "PATH is empty or unset." \
      "A missing PATH prevents command resolution and makes onboarding failures hard to interpret." \
      "Set PATH in the active shell session before rerunning diagnostics."
    return
  fi

  path_remainder="${PATH}:"
  valid_entries=0
  missing_entries=0
  empty_entries=0

  while [ -n "$path_remainder" ]; do
    path_entry=${path_remainder%%:*}
    path_remainder=${path_remainder#*:}

    if [ -z "$path_entry" ]; then
      empty_entries=$((empty_entries + 1))
    elif [ -d "$path_entry" ]; then
      valid_entries=$((valid_entries + 1))
    else
      missing_entries=$((missing_entries + 1))
    fi
  done

  if [ "$valid_entries" -eq 0 ]; then
    print_result \
      "FAIL" \
      "preflight:path-sane" \
      "PATH sanity" \
      "ENVIRONMENT" \
      "PATH does not contain an existing directory." \
      "Inspected PATH entries but none resolve to an existing directory." \
      "Add the system and tool directories used by the active shell to PATH."
  elif [ "$missing_entries" -gt 0 ] || [ "$empty_entries" -gt 0 ]; then
    print_result \
      "WARN" \
      "preflight:path-sane" \
      "PATH sanity" \
      "ENVIRONMENT" \
      "PATH contains entries that may make command resolution unreliable." \
      "Found $valid_entries existing, $missing_entries missing, and $empty_entries empty PATH entries." \
      "Remove missing or empty entries from PATH, then start a new shell session."
  else
    print_result \
      "PASS" \
      "preflight:path-sane" \
      "PATH sanity" \
      "ENVIRONMENT" \
      "PATH contains only existing directories." \
      "Validated $valid_entries PATH entries for the current shell session."
  fi
}

check_shell() {
  if [ -n "${SHELL:-}" ] && command -v "$SHELL" >/dev/null 2>&1; then
    shell_path=$(command -v "$SHELL")
    print_result \
      "PASS" \
      "preflight:shell-available" \
      "Shell availability" \
      "ENVIRONMENT" \
      "The configured shell is available." \
      "Resolved SHELL to $shell_path."
  elif command -v sh >/dev/null 2>&1; then
    fallback_shell_path=$(command -v sh)
    print_result \
      "WARN" \
      "preflight:shell-available" \
      "Shell availability" \
      "ENVIRONMENT" \
      "A POSIX shell is available, but SHELL is unset or cannot be resolved." \
      "Resolved sh at $fallback_shell_path while SHELL is not usable." \
      "Set SHELL to the executable for the shell used by the current session."
  else
    print_result \
      "FAIL" \
      "preflight:shell-available" \
      "Shell availability" \
      "ENVIRONMENT" \
      "No configured or fallback shell can be resolved." \
      "SHELL is unset or unavailable, and sh is not visible in PATH." \
      "Install a POSIX-compatible shell and ensure it is visible in PATH."
  fi
}

printf 'Onboarding Diagnostics preflight\n'
printf 'Track: Onboarding Diagnostics Lab\n'
printf 'Layer: preflight\n\n'

check_command "node" "preflight:node-available" "Node.js availability" "Node.js"
check_command "npm" "preflight:npm-available" "npm availability" "npm"
check_command "npx" "preflight:npx-available" "npx availability" "npx"
check_path

if command -v node >/dev/null 2>&1; then
  if node_version=$(node -v 2>/dev/null); then
    node_major=$(printf '%s' "$node_version" | sed 's/^v//' | cut -d. -f1)
    case "$node_major" in
      ''|*[!0-9]*)
        print_result \
          "FAIL" \
          "preflight:node-version-compatible" \
          "Node.js version compatibility" \
          "ENVIRONMENT" \
          "Node.js reported an unrecognized version." \
          "Detected $node_version from node -v." \
          "Install Node.js 20 or newer, then rerun preflight."
        ;;
      *)
        if [ "$node_major" -ge 20 ]; then
          print_result \
            "PASS" \
            "preflight:node-version-compatible" \
            "Node.js version compatibility" \
            "ENVIRONMENT" \
            "Node.js meets the minimum supported version." \
            "Detected $node_version; Onboarding Diagnostics requires Node.js 20 or newer."
        else
          print_result \
            "FAIL" \
            "preflight:node-version-compatible" \
            "Node.js version compatibility" \
            "ENVIRONMENT" \
            "Node.js is older than the minimum supported version." \
            "Detected $node_version; Onboarding Diagnostics requires Node.js 20 or newer." \
            "Upgrade to Node.js 20 or newer, then rerun preflight."
        fi
        ;;
    esac
  else
    print_result \
      "FAIL" \
      "preflight:node-version-compatible" \
      "Node.js version compatibility" \
      "ENVIRONMENT" \
      "Node.js is available, but its version could not be read." \
      "The preflight layer could resolve node but node -v did not return a version." \
      "Install Node.js 20 or newer, then rerun preflight."
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
    "Some onboarding workflows may need write access in the current directory." \
    "Move to a writable working directory or update its permissions before installing project dependencies."
fi

check_shell

printf 'Summary: PASS=%s WARN=%s FAIL=%s\n' "$PASS_COUNT" "$WARN_COUNT" "$FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
  printf 'NEXT STEP: Fix the FAIL results above, then rerun this preflight script.\n'
elif [ "$WARN_COUNT" -gt 0 ]; then
  printf 'NEXT STEP: Review the WARN results above, then run `npx --yes @onboarding-diagnostics-lab/onboarding-diagnostics doctor`.\n'
else
  printf 'NEXT STEP: Run `npx --yes @onboarding-diagnostics-lab/onboarding-diagnostics doctor` for full diagnostics.\n'
fi

exit "$EXIT_CODE"
