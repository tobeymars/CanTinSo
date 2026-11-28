# CanTinSo — kiểm tra build trước khi chạy migration mới.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
function Check($label) {
    if ($LASTEXITCODE -ne 0) {
        throw "$label FAILED (exit code $LASTEXITCODE). STOP before migration."
    }
}
Set-Location (Join-Path $root 'cantinso-backend')
Write-Host '[1/12] Prisma validate'
npx prisma validate
Check 'Prisma validate'
Write-Host '[2/12] Prisma generate'
npx prisma generate
Check 'Prisma generate'
Write-Host '[3/12] Backend unit conversion tests'
npm run test:units
Check 'Unit conversion tests'
Write-Host '[4/12] Warehouse voucher evidence tests'
npm run test:stock-vouchers
Check 'Warehouse voucher tests'
Write-Host '[5/12] Approved menu ingredient forecast tests'
npm run test:stock-forecast
Check 'Approved menu forecast tests'
npm run test:school-warehouse-access
Check 'School warehouse access tests'
Write-Host '[6/12] Supervision date policy tests'
npm run test:supervision-dates
Check 'Supervision date tests'
Write-Host '[7/12] Food safety form validation tests'
npm run test:supervision-food
Check 'Food safety form tests'
Write-Host '[8/12] Arrival receipt validation tests'
npm run test:supervision-arrival
Check 'Arrival receipt tests'
Write-Host '[9/12] Serving stage validation tests'
npm run test:supervision-serving
Check 'Serving stage tests'
npm run test:supervision-stages
Check 'Stage responsibility tests'
npm run test:supervision-dispatch
Check 'Dispatch handover form tests'
Write-Host '[10/12] Backend build'
npm run build
Check 'Backend build'
Set-Location (Join-Path $root 'school-food-safety-main')
Write-Host '[11/12] Frontend build'
npm run build
Check 'Frontend build'
Write-Host '[12/12] Frontend unit conversion tests'
npm run test:units
Check 'Frontend unit tests'
Write-Host 'BUILD OK. Migrations were NOT applied automatically.' -ForegroundColor Green
