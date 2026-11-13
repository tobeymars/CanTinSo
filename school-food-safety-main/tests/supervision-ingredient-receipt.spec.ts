import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function switchWorkspace(page: import('@playwright/test').Page, role: string) {
  await page.getByRole('button', { name: 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: role, exact: true }).click()
}

test('bếp ghi nhận nguyên liệu bước 1 và BGH đối chiếu đúng snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 })
  await page.goto('/')
  await switchWorkspace(page, 'Bếp trung tâm')
  await page.getByRole('link', { name: 'Giám sát & an toàn', exact: true }).click()
  const journey = page.getByRole('region', { name: 'Cập nhật mốc vận hành bữa trưa' })
  await expect(journey.getByText('Bắt đầu chế biến', { exact: true })).toHaveCount(0)
  await expect(journey.getByRole('button', { name: 'Cập nhật: Xuất bếp' })).toBeVisible()

  const stepOne = page.locator('.supervision-check-row').filter({ hasText: 'Kiểm thực bước 1 · Tiếp nhận nguyên liệu' })
  await stepOne.getByRole('button', { name: 'Cập nhật', exact: true }).click()
  const report = page.getByRole('dialog', { name: 'Cập nhật trạng thái' })

  await report.getByRole('combobox', { name: 'Nguyên liệu dòng 1' }).click()
  await expect(page.getByRole('option')).toHaveCount(3)
  await page.getByRole('searchbox', { name: 'Tìm trong Nguyên liệu dòng 1' }).fill('gạo')
  await expect(page.getByRole('option')).toHaveCount(1)
  await page.getByRole('option', { name: /Gạo thơm/ }).click()
  await expect(report.getByText('HTX Nông nghiệp An Phú', { exact: true })).toBeVisible()
  await expect(report.getByText('Phạm Thanh Hương', { exact: true })).toBeVisible()
  await expect(report.getByText(/20\/3\/2027/)).toBeVisible()
  await report.getByLabel('Số lượng Gạo thơm').fill('32.5')

  await report.getByRole('button', { name: 'Thêm dòng' }).click()
  await report.getByRole('combobox', { name: 'Nguyên liệu dòng 2' }).click()
  await page.getByRole('searchbox', { name: 'Tìm trong Nguyên liệu dòng 2' }).fill('thịt gà')
  await page.getByRole('option', { name: /Thịt gà/ }).click()
  await expect(report.getByText('Thực phẩm An Tâm', { exact: true })).toBeVisible()
  await expect(report.getByText('Võ Đức Minh', { exact: true })).toBeVisible()
  await report.getByLabel('Số lượng Thịt gà').fill('18')
  await report.getByRole('combobox', { name: 'Tham chiếu hồ sơ' }).click()
  await page.getByRole('searchbox', { name: 'Tìm trong Tham chiếu hồ sơ' }).fill('PN-1710-01')
  await page.getByRole('option', { name: /DEMO-PN-1710-01/ }).click()
  await report.getByLabel(/Ghi chú \/ nội dung ghi nhận/).fill('Đã đối chiếu số lượng, nhà cung cấp và hạn dùng theo lô DEMO.')
  await report.getByRole('button', { name: 'Lưu và gửi BGH xác nhận' }).click()

  await expect(stepOne.getByText('2 nguyên liệu đã ghi nhận')).toBeVisible()
  await expect(stepOne.getByText(/Gạo thơm: 32,5 kg/)).toBeVisible()

  await switchWorkspace(page, 'Ban Giám hiệu')
  await page.getByRole('link', { name: 'Giám sát & an toàn', exact: true }).click()
  const boardStepOne = page.locator('.supervision-check-row').filter({ hasText: 'Kiểm thực bước 1 · Tiếp nhận nguyên liệu' })
  await boardStepOne.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Xác nhận trạng thái' })
  await expect(confirmation.getByText('32,5 kg', { exact: true })).toBeVisible()
  await expect(confirmation.getByText('HTX Nông nghiệp An Phú', { exact: true })).toBeVisible()
  await expect(confirmation.getByText('Phạm Thanh Hương', { exact: true })).toBeVisible()
  await confirmation.getByLabel(/Ghi chú \/ nội dung ghi nhận/).fill('BGH đã đối chiếu danh sách nguyên liệu trong hồ sơ DEMO.')
  await confirmation.getByRole('button', { name: 'Xác nhận DEMO' }).click()
  await expect(boardStepOne.getByText('Đã xác nhận (DEMO)')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page }).include('.supervision-checklist').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(accessibility.violations.map(violation => violation.id)).toEqual([])
})
