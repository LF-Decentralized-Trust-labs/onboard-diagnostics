$ErrorActionPreference = "Stop"

$exitCode = 0
$passCount = 0
$warnCount = 0
$failCount = 0

function Write-Result {
    param(
        [ValidateSet("PASS", "WARN", "FAIL")]
        [string]$Status,
        [string]$Id,
        [string]$Title,
        [string]$Category,
        [string]$Summary,
        [string]$Details,
        [string]$SuggestedFix = ""
    )

    switch ($Status) {
        "PASS" { $script:passCount += 1 }
        "WARN" { $script:warnCount += 1 }
        "FAIL" {
            $script:failCount += 1
            $script:exitCode = 1
        }
    }

    Write-Output "[$Status] $Title"
    Write-Output "  id: $Id"
    Write-Output "  category: $Category"
    Write-Output "  summary: $Summary"
    Write-Output "  details: $Details"
    if ($SuggestedFix) {
        Write-Output "  suggested_fix: $SuggestedFix"
    }
    Write-Output ""
}

function Test-Command {
    param(
        [string]$CommandName,
        [string]$Id,
        [string]$Title,
        [string]$DisplayName
    )

    $command = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($command) {
        Write-Result "PASS" $Id $Title "DEPENDENCY" `
            "$DisplayName is available on PATH." `
            "Resolved $CommandName at $($command.Source)."
        return
    }

    Write-Result "FAIL" $Id $Title "DEPENDENCY" `
        "$DisplayName is not available on PATH." `
        "The preflight layer expected to find $CommandName in PATH but could not resolve it." `
        "Install $DisplayName and ensure it is visible in PATH before rerunning diagnostics."
}

Write-Output "Onboarding Diagnostics preflight"
Write-Output "Track: Onboarding Diagnostics Lab"
Write-Output "Layer: preflight"
Write-Output ""

$nodeAvailable = [bool](Get-Command node -ErrorAction SilentlyContinue)
Test-Command "node" "preflight:node-available" "Node.js availability" "Node.js"
Test-Command "npm" "preflight:npm-available" "npm availability" "npm"
Test-Command "npx" "preflight:npx-available" "npx availability" "npx"

$pathEntries = @($env:PATH -split [IO.Path]::PathSeparator)
$validEntries = @($pathEntries | Where-Object { $_ -and (Test-Path $_ -PathType Container) }).Count
$missingEntries = @($pathEntries | Where-Object { $_ -and -not (Test-Path $_ -PathType Container) }).Count
$emptyEntries = @($pathEntries | Where-Object { -not $_ }).Count

if (-not $env:PATH -or $validEntries -eq 0) {
    Write-Result "FAIL" "preflight:path-sane" "PATH sanity" "ENVIRONMENT" `
        "PATH does not contain an existing directory." `
        "Found $validEntries existing, $missingEntries missing, and $emptyEntries empty PATH entries." `
        "Add the system and tool directories used by the active PowerShell session to PATH."
} elseif ($missingEntries -gt 0 -or $emptyEntries -gt 0) {
    Write-Result "WARN" "preflight:path-sane" "PATH sanity" "ENVIRONMENT" `
        "PATH contains entries that may make command resolution unreliable." `
        "Found $validEntries existing, $missingEntries missing, and $emptyEntries empty PATH entries." `
        "Remove missing or empty entries from PATH, then start a new PowerShell session."
} else {
    Write-Result "PASS" "preflight:path-sane" "PATH sanity" "ENVIRONMENT" `
        "PATH contains only existing directories." `
        "Validated $validEntries PATH entries for the current PowerShell session."
}

if ($nodeAvailable) {
    try {
        $nodeVersion = (& node -v 2>$null).Trim()
        if ($nodeVersion -match '^v?(\d+)\.') {
            $nodeMajor = [int]$Matches[1]
            if ($nodeMajor -ge 20) {
                Write-Result "PASS" "preflight:node-version-compatible" "Node.js version compatibility" "ENVIRONMENT" `
                    "Node.js meets the minimum supported version." `
                    "Detected $nodeVersion; Onboarding Diagnostics requires Node.js 20 or newer."
            } else {
                Write-Result "FAIL" "preflight:node-version-compatible" "Node.js version compatibility" "ENVIRONMENT" `
                    "Node.js is older than the minimum supported version." `
                    "Detected $nodeVersion; Onboarding Diagnostics requires Node.js 20 or newer." `
                    "Upgrade to Node.js 20 or newer, then rerun preflight."
            }
        } else {
            Write-Result "FAIL" "preflight:node-version-compatible" "Node.js version compatibility" "ENVIRONMENT" `
                "Node.js reported an unrecognized version." `
                "Detected $nodeVersion from node -v." `
                "Install Node.js 20 or newer, then rerun preflight."
        }
    } catch {
        Write-Result "FAIL" "preflight:node-version-compatible" "Node.js version compatibility" "ENVIRONMENT" `
            "Node.js is available, but its version could not be read." `
            "The preflight layer could resolve node but node -v failed." `
            "Install Node.js 20 or newer, then rerun preflight."
    }
}

$npmCommand = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCommand) {
    try {
        $npmVersion = (& npm -v 2>$null).Trim()
        Write-Result "PASS" "preflight:npm-version-visible" "npm version visibility" "ENVIRONMENT" `
            "npm reports a version." "Detected $npmVersion from npm -v."
    } catch {
        Write-Result "WARN" "preflight:npm-version-visible" "npm version visibility" "ENVIRONMENT" `
            "npm is available, but its version could not be read." `
            "The preflight layer could resolve npm but npm -v did not return a version."
    }
}

$probePath = Join-Path (Get-Location) ".onboarding-diagnostics-write-probe-$PID"
try {
    [IO.File]::WriteAllText($probePath, "")
    Remove-Item $probePath -Force
    Write-Result "PASS" "preflight:working-directory-writable" "Working directory writability" "PERMISSIONS" `
        "Current working directory is writable." `
        "The preflight layer can write in the current directory."
} catch {
    Write-Result "WARN" "preflight:working-directory-writable" "Working directory writability" "PERMISSIONS" `
        "Current working directory is not writable." `
        "Some onboarding workflows may need write access in the current directory." `
        "Move to a writable working directory or update its permissions before installing project dependencies."
}

Write-Result "PASS" "preflight:shell-available" "Shell availability" "ENVIRONMENT" `
    "PowerShell is available." `
    "Running with PowerShell $($PSVersionTable.PSVersion)."

Write-Output "Summary: PASS=$passCount WARN=$warnCount FAIL=$failCount"
if ($failCount -gt 0) {
    Write-Output "NEXT STEP: Fix the FAIL results above, then rerun this preflight script."
} elseif ($warnCount -gt 0) {
    Write-Output "NEXT STEP: Review the WARN results above, then run ``npx --yes @onboarding-diagnostics-lab/onboarding-diagnostics doctor``."
} else {
    Write-Output "NEXT STEP: Run ``npx --yes @onboarding-diagnostics-lab/onboarding-diagnostics doctor`` for full diagnostics."
}

exit $exitCode
