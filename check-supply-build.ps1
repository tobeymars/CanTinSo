# CanTinSo — kiểm tra build trước khi chạy migration mới.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
function Check($label) {
    if ($LASTEXITCODE -ne 0) {
        throw "$label FAILED (exit code $LASTEXITCODE). STOP before migration."
    }
}
Set-Location (Join-Path $root 'cantinso-backend')
Write-Host '[1/6] Prisma validate'
npx prisma validate
Check 'Prisma validate'
Write-Host '[2/6] Prisma generate'
npx prisma generate
Check 'Prisma generate'
Write-Host '[3/6] Backend unit conversion tests'
npm run test:units
Check 'Unit conversion tests'
Write-Host '[4/6] Backend build'
npm run build
Check 'Backend build'
Set-Location (Join-Path $root 'school-food-safety-main')
Write-Host '[5/6] Frontend build'
npm run build
Check 'Frontend build'
Write-Host '[6/6] Frontend unit conversion tests'
npm run test:units
Check 'Frontend unit tests'
Write-Host 'BUILD OK. Migrations were NOT applied automatically.' -ForegroundColor Green
