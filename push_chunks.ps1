$ErrorActionPreference = 'Stop'

Write-Host "Resetting last commit..."
git reset HEAD~1

Write-Host "Adding code and small files..."
git add homefarm/css/
git add homefarm/js/
git add homefarm/tools/
git add homefarm/index.html
git commit -m "chunk 1 (code)"
git push

Write-Host "Adding varieties..."
$varieties = Get-ChildItem "homefarm/assets/images/varieties" -Directory
$chunkIdx = 2
foreach ($v in $varieties) {
    Write-Host "Adding variety: $($v.Name)"
    git add $v.FullName
    git commit -m "chunk $chunkIdx ($($v.Name))"
    
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
