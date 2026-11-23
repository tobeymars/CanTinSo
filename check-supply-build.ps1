# CanTinSo — kiểm tra build trước khi chạy migration mới.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
function Check($label) {
    if ($LASTEXITCODE -ne 0) {
        throw "$label FAILED (exit code $LASTEXITCODE). STOP before migration."
    }
}
Set-Location (Join-Path $root 'cantinso-backend')
Write-Host '[1/9] Prisma validate'
npx prisma validate
Check 'Prisma validate'
Write-Host '[2/9] Prisma generate'
npx prisma generate
Check 'Prisma generate'
Write-Host '[3/9] Backend unit conversion tests'
npm run test:units
Check 'Unit conversion tests'
Write-Host '[4/9] Supervision date policy tests'
npm run test:supervision-dates
Check 'Supervision date tests'
Write-Host '[5/9] Food safety form validation tests'
npm run test:supervision-food
Check 'Food safety form tests'
Write-Host '[6/9] Arrival receipt validation tests'
npm run test:supervision-arrival
Check 'Arrival receipt tests'
Write-Host '[7/9] Backend build'
npm run build
Check 'Backend build'
Set-Location (Join-Path $root 'school-food-safety-main')
Write-Host '[8/9] Frontend build'
npm run build
Check 'Frontend build'
Write-Host '[9/9] Frontend unit conversion tests'
npm run test:units
Check 'Frontend unit tests'
Write-Host 'BUILD OK. Migrations were NOT applied automatically.' -ForegroundColor Green
