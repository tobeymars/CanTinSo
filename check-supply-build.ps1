# CanTinSo — kiểm tra build trước khi chạy migration mới.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
function Check($label) {
    if ($LASTEXITCODE -ne 0) {
        throw "$label FAILED (exit code $LASTEXITCODE). STOP before migration."
    }
}
Set-Location (Join-Path $root 'cantinso-backend')
Write-Host '[1/11] Prisma validate'
npx prisma validate
Check 'Prisma validate'
Write-Host '[2/11] Prisma generate'
npx prisma generate
Check 'Prisma generate'
Write-Host '[3/11] Backend unit conversion tests'
npm run test:units
Check 'Unit conversion tests'
Write-Host '[4/11] Warehouse voucher evidence tests'
npm run test:stock-vouchers
Check 'Warehouse voucher tests'
Write-Host '[5/11] Supervision date policy tests'
npm run test:supervision-dates
Check 'Supervision date tests'
Write-Host '[6/11] Food safety form validation tests'
npm run test:supervision-food
Check 'Food safety form tests'
Write-Host '[7/11] Arrival receipt validation tests'
npm run test:supervision-arrival
Check 'Arrival receipt tests'
Write-Host '[8/11] Serving stage validation tests'
npm run test:supervision-serving
Check 'Serving stage tests'
Write-Host '[9/11] Backend build'
npm run build
Check 'Backend build'
Set-Location (Join-Path $root 'school-food-safety-main')
Write-Host '[10/11] Frontend build'
npm run build
Check 'Frontend build'
Write-Host '[11/11] Frontend unit conversion tests'
npm run test:units
Check 'Frontend unit tests'
Write-Host 'BUILD OK. Migrations were NOT applied automatically.' -ForegroundColor Green
