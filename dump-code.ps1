# Script to concatenate all source files into one file for AI analysis

$OutputFile = "codebase-dump.txt"
Write-Host "Dumping codebase to $OutputFile..."

# Clear the output file
"" | Out-File -FilePath $OutputFile -Encoding utf8

# Add header
Add-Content -Path $OutputFile -Value "=== Engage Africa Unified Codebase Dump ==="
Add-Content -Path $OutputFile -Value "Generated: $(Get-Date)"
Add-Content -Path $OutputFile -Value ""

# Find and concatenate all relevant source files
$files = Get-ChildItem -Path . -Recurse -File `
  | Where-Object { 
      $_.Extension -match '\.(ts|tsx|js|jsx|json)$' -and 
      $_.FullName -notmatch 'node_modules' -and 
      $_.FullName -notmatch '\.next' -and 
      $_.FullName -notmatch '\.git' -and 
      $_.FullName -notmatch 'dist' -and 
      $_.FullName -notmatch '\.turbo'
    } `
  | Sort-Object FullName

foreach ($file in $files) {
    Add-Content -Path $OutputFile -Value "=== File: $($file.FullName.Replace((Get-Location).Path, '').TrimStart('\')) ==="
    Add-Content -Path $OutputFile -Value ""
    Get-Content -Path $file.FullName -Raw | Out-File -FilePath $OutputFile -Append -Encoding utf8
    Add-Content -Path $OutputFile -Value ""
    Add-Content -Path $OutputFile -Value ""
}

$fileSize = (Get-Item $OutputFile).Length / 1KB
Write-Host "Done! Output saved to $OutputFile"
Write-Host "File size: $([math]::Round($fileSize, 2)) KB"
