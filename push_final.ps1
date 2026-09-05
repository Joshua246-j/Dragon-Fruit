$ErrorActionPreference = 'Stop'

Write-Host "Pushing the lingering voodoo-child chunk..."
$pushAttempt = 0
$pushSuccess = $false
while ($pushAttempt -lt 5 -and -not $pushSuccess) {
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        $pushSuccess = $true
    } else {
        Write-Host "Push failed, retrying ($($pushAttempt+1)/5)..."
        $pushAttempt++
        Start-Sleep -Seconds 10
    }
}
if (-not $pushSuccess) {
    Write-Host "Failed to push lingering voodoo-child chunk. Exiting."
    exit 1
}

Write-Host "Adding remaining files..."
git add .
$status = git status --short
if (-not [string]::IsNullOrWhiteSpace($status)) {
    git commit -m "chunk final"
    $pushAttempt = 0
    $pushSuccess = $false
    while ($pushAttempt -lt 5 -and -not $pushSuccess) {
        git push origin main
        if ($LASTEXITCODE -eq 0) {
            $pushSuccess = $true
        } else {
            Write-Host "Push failed, retrying ($($pushAttempt+1)/5)..."
            $pushAttempt++
            Start-Sleep -Seconds 10
        }
    }
    if (-not $pushSuccess) {
        Write-Host "Failed to push final chunk. Exiting."
        exit 1
    }
}

Write-Host "All chunks pushed successfully!"
Write-Host "Squashing into a single commit..."
git reset --soft origin/main
git commit -m "Update homefarm assets, styles, and js components"
git push -f origin main

Write-Host "Done!"
