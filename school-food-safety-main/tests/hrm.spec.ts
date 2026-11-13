import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { choose } from './helpers/select'

async function switchWorkspace(page: import('@playwright/test').Page, role: string) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 760
  await page.getByRole('button', { name: mobile ? 'Tài khoản' : 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: role, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('demo-central-kitchen-employees-v1')
    localStorage.removeItem('demo-central-kitchen-assignments-v1')
  })
  await page.reload()
})

test('central kitchen manages demo employees and persists weekly assignments locally', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await switchWorkspace(page, 'Bếp trung tâm')
  await page.getByRole('link', { name: 'Nhân sự & phân ca', exact: true }).click()

  await expect(page.locator('.hrm-page').getByRole('heading', { name: 'Nhân sự & phân ca', level: 2 })).toBeVisible()
  await expect(page.locator('.management-kpis article').filter({ hasText: 'Nhân sự đang làm việc' }).locator('strong')).toHaveText('7')
  await page.getByRole('button', { name: 'Thêm nhân sự' }).click()
  const employee = page.getByRole('dialog', { name: 'Thêm nhân sự' })
  await employee.getByLabel('Mã nhân sự').fill('BC-E2E')
  await employee.getByLabel('Họ và tên').fill('Nhân sự Minh Họa')
  await employee.getByLabel('Điện thoại DEMO').fill('0900000199')
  await employee.getByRole('button', { name: 'Lưu nhân sự' }).click()
  await expect(page.getByText('Đã thêm nhân sự DEMO.')).toBeVisible()
  await expect(page.locator('.hrm-employee-table tbody tr').filter({ hasText: 'Nhân sự Minh Họa' })).toHaveCount(1)

  await page.getByRole('button', { name: 'Lịch phân ca', exact: true }).click()
  await expect(page.getByRole('heading', { name: '26/10 – 01/11' })).toBeVisible()
  await page.getByRole('button', { name: 'Phân ca Nhân sự Minh Họa ngày 26/10/2026' }).click()
  const assignment = page.getByRole('dialog', { name: 'Phân ca làm' })
  await choose(assignment.getByLabel('Khu vực'),{ label: 'Chia suất & đóng gói' })
  await assignment.getByLabel('Nhiệm vụ').fill('Kiểm đếm và đóng gói suất ăn')
  await assignment.getByRole('button', { name: 'Lưu phân ca' }).click()
  await expect(page.getByText('Đã phân ca làm DEMO.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sửa ca Nhân sự Minh Họa ngày 26/10/2026' })).toBeVisible()

  await page.reload()
  await switchWorkspace(page, 'Bếp trung tâm')
  await page.getByRole('link', { name: 'Nhân sự & phân ca', exact: true }).click()
  await expect(page.getByText('Nhân sự Minh Họa', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Lịch phân ca', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sửa ca Nhân sự Minh Họa ngày 26/10/2026' })).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/hrm-desktop-1440.png', fullPage: true })

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([])
})

test('HRM navigation is scoped to central kitchen and remains responsive on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await switchWorkspace(page, 'Bếp trung tâm')
  await page.getByRole('button', { name: 'Mở menu' }).click()
  await page.getByRole('link', { name: 'Nhân sự & phân ca', exact: true }).click()
  await expect(page.locator('.hrm-page').getByRole('heading', { name: 'Nhân sự & phân ca', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Lịch phân ca', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'docs/screenshots/hrm-mobile-390.png', fullPage: false })

  await switchWorkspace(page, 'Ban Giám hiệu')
  await expect(page.getByRole('link', { name: 'Nhân sự & phân ca', exact: true })).toHaveCount(0)
  await page.evaluate(() => { history.pushState({}, '', '/nhan-su-bep'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Nhân sự & phân ca', exact: true })).toHaveCount(0)
})
