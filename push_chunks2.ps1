$ErrorActionPreference = 'Stop'

Write-Host "Resetting the failed chunk final..."
git reset HEAD~1

Write-Host "Adding dragon fruit frames in chunks..."
$dragonFruits = Get-ChildItem "homefarm/assets/dragon-fruit" -Directory
$chunkIdx = 3
foreach ($df in $dragonFruits) {
    Write-Host "Adding dragon fruit: $($df.Name)"
    git add $df.FullName
    git commit -m "chunk $chunkIdx ($($df.Name))"
    
    $pushAttempt = 0
    $pushSuccess = $false
    while ($pushAttempt -lt 5 -and -not $pushSuccess) {
        git push
        if ($LASTEXITCODE -eq 0) {
            $pushSuccess = $true
        } else {
            Write-Host "Push failed, retrying ($($pushAttempt+1)/5)..."
            $pushAttempt++
            Start-Sleep -Seconds 5
        }
    }
    if (-not $pushSuccess) {
        Write-Host "Failed to push chunk $chunkIdx. Exiting."
        exit 1
    }
    $chunkIdx++
}

Write-Host "Adding remaining files..."
git add .
git commit -m "chunk final"
$pushAttempt = 0
$pushSuccess = $false
while ($pushAttempt -lt 5 -and -not $pushSuccess) {
    git push
    if ($LASTEXITCODE -eq 0) {
        $pushSuccess = $true
    } else {
        Write-Host "Push failed, retrying ($($pushAttempt+1)/5)..."
        $pushAttempt++
        Start-Sleep -Seconds 5
    }
}
if (-not $pushSuccess) {
    Write-Host "Failed to push final chunk. Exiting."
    exit 1
}

Write-Host "All chunks pushed successfully!"
Write-Host "Squashing into a single commit..."
git reset --soft origin/main
git commit -m "Update homefarm assets, styles, and js components"
git push -f

Write-Host "Done!"
