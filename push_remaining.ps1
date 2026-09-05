$ErrorActionPreference = 'Stop'

# Get all untracked and modified directories/files in dragon-fruit
$dragonFruits = Get-ChildItem "homefarm/assets/dragon-fruit" -Directory

$chunkIdx = 6
foreach ($df in $dragonFruits) {
    # Check if directory has untracked or modified files
    $status = git status --short $df.FullName
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        Write-Host "Adding dragon fruit: $($df.Name)"
        git add $df.FullName
        git commit -m "chunk $chunkIdx ($($df.Name))"
        
        $pushAttempt = 0
        $pushSuccess = $false
        while ($pushAttempt -lt 5 -and -not $pushSuccess) {
            git push origin main
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
    } else {
        Write-Host "Skipping $($df.Name), already tracked and unchanged."
    }
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
            Start-Sleep -Seconds 5
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
