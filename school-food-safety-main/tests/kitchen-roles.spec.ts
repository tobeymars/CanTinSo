import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function chooseRole(page: import('@playwright/test').Page, name: string) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 760
  await page.getByRole('button', { name: mobile ? 'Tài khoản' : 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name, exact: true }).click()
}

test('central-kitchen roles receive focused dashboards and scoped navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  const roles = [
    { name:'Bếp trưởng · Bếp trung tâm', title:'Điều phối dây chuyền chế biến.', visible:['Nhân sự & phân ca','Quản lý kho'], hidden:['Nhà cung cấp','QR từng món ăn'] },
    { name:'Sơ chế · Bếp trung tâm', title:'Chuẩn bị đúng lô, đúng định lượng.', visible:['Nguồn gốc nguyên liệu','Tiến trình suất ăn'], hidden:['Nhân sự & phân ca','Quản lý kho'] },
    { name:'Nấu chính · Bếp trung tâm', title:'Theo dõi từng mẻ nấu.', visible:['Thực đơn & bữa ăn','Tiến trình suất ăn'], hidden:['Nhân sự & phân ca','QR từng món ăn'] },
    { name:'Chia suất & đóng gói · Bếp trung tâm', title:'Đủ suất trước giờ xuất bếp.', visible:['QR từng món ăn','Tiến trình suất ăn'], hidden:['Nhân sự & phân ca','Nhà cung cấp'] },
    { name:'Điều phối giao nhận · Bếp trung tâm', title:'Đúng chuyến, đúng trường, đúng giờ.', visible:['QR từng món ăn','Ghi nhận nhập / xuất'], hidden:['Nhân sự & phân ca','Thực đơn & bữa ăn'] },
    { name:'Vệ sinh · Bếp trung tâm', title:'Giữ nhịp vệ sinh xuyên suốt ca.', visible:['Giám sát & hồ sơ','Hồ sơ & giấy tờ'], hidden:['Tiến trình suất ăn','QR từng món ăn'] },
  ] as const

  for (const role of roles) {
    await chooseRole(page, role.name)
    await expect(page.locator('.kitchen-role-dashboard').getByRole('heading', { name: role.title })).toBeVisible()
    for (const item of role.visible) await expect(page.getByRole('link', { name: item, exact: true })).toBeVisible()
    for (const item of role.hidden) await expect(page.getByRole('link', { name: item, exact: true })).toHaveCount(0)
  }
})

test('role checklist persists and direct access outside assigned area is denied', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await chooseRole(page, 'Sơ chế · Bếp trung tâm')
  const task = page.getByRole('button', { name: /05:50.*Đối chiếu lô gạo/ })
  await expect(task).toHaveAttribute('aria-pressed', 'false')
  await task.click()
  await expect(task).toHaveAttribute('aria-pressed', 'true')
  await chooseRole(page, 'Nấu chính · Bếp trung tâm')
  await chooseRole(page, 'Sơ chế · Bếp trung tâm')
  await expect(page.getByRole('button', { name: /05:50.*Đối chiếu lô gạo/ })).toHaveAttribute('aria-pressed', 'true')

  await page.evaluate(() => { history.pushState({}, '', '/ma-qr-suat-an'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.getByRole('heading', { name: 'Không có quyền truy cập' })).toBeVisible()
  await expect(page.getByText('Vai trò Nhân viên sơ chế không được phân công sử dụng khu vực này.')).toBeVisible()
})

test('head chef manages schedules without editing employee profiles; dispatcher owns dispatch action', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await chooseRole(page, 'Bếp trưởng · Bếp trung tâm')
  await page.getByRole('link', { name: 'Nhân sự & phân ca', exact: true }).click()
  await expect(page.getByText(/Bếp trưởng được xem hồ sơ và phân ca vận hành/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thêm nhân sự' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Sửa / })).toHaveCount(0)
  await page.getByRole('button', { name: 'Lịch phân ca', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Phân ca', exact: true })).toBeVisible()

  await chooseRole(page, 'Điều phối giao nhận · Bếp trung tâm')
  await page.getByRole('link', { name: 'Tiến trình suất ăn', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Đã xuất bếp', exact: true })).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/kitchen-dispatcher-1440.png', fullPage: true })
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(violation => violation.id)).toEqual([])
})

test('packing workspace is usable on a 390px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await chooseRole(page, 'Chia suất & đóng gói · Bếp trung tâm')
  await expect(page.getByRole('heading', { name: 'Đủ suất trước giờ xuất bếp.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'QR suất ăn', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'docs/screenshots/kitchen-packing-mobile-390.png', fullPage: false })
})
