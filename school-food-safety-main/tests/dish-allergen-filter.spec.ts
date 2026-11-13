import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function openDishEditor(page: import('@playwright/test').Page) {
  await page.goto('/')
  const mobile = (page.viewportSize()?.width ?? 1280) <= 760
  await page.getByRole('button', { name: mobile ? 'Tài khoản' : 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: 'Bếp trung tâm', exact: true }).click()
  if (mobile) await page.getByRole('button', { name: 'Thêm', exact: true }).click()
  await page.getByRole('link', { name: 'Tạo món & dinh dưỡng', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo món mới', exact: true }).click()
}

async function openNutritionAssistant(page: import('@playwright/test').Page) {
  await openDishEditor(page)
  await page.getByRole('textbox', { name: /^Tên món/ }).fill('Món kiểm thử dị nguyên')
  await page.getByRole('textbox', { name: /^Mô tả và hướng dẫn chế biến/ }).fill('Công thức dùng để kiểm thử bộ lọc dị nguyên.')
  await page.getByRole('button', { name: 'Tiếp tục' }).click()
  await page.getByRole('button', { name: 'Gợi ý công thức' }).click()
}

test('gợi ý món ăn xuất hiện ngay bước đầu và tự điền công thức được chọn', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openDishEditor(page)

  await expect(page.getByRole('heading', { name: 'Gợi ý món ăn phù hợp' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Dùng công thức gợi ý/ })).toHaveCount(3)
  await page.screenshot({ path: 'docs/screenshots/dish-starter-suggestions-desktop.png', fullPage: false })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'docs/screenshots/dish-starter-suggestions-mobile-390.png', fullPage: false })
  await page.getByRole('button', { name: 'Dùng công thức gợi ý Cơm cá phi lê sốt cà chua' }).click()

  await expect(page.getByRole('heading', { name: 'Nguyên liệu & định lượng' })).toBeVisible()
  await expect(page.locator('input[value="Cá phi lê"]')).toBeVisible()
  await page.getByRole('button', { name: /Thông tin món/ }).click()
  await expect(page.getByRole('textbox', { name: /^Tên món/ })).toHaveValue('Cơm cá phi lê sốt cà chua')
})

test('bộ lọc dị nguyên hiển thị rõ trạng thái và lọc công thức gợi ý', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await openNutritionAssistant(page)

  const filter = page.getByRole('group', { name: 'Lọc tránh dị nguyên' })
  await expect(filter).toBeVisible()
  await expect(filter.getByText('Chưa chọn', { exact: true })).toBeVisible()
  await expect(page.getByText('3 công thức phù hợp', { exact: true })).toBeVisible()

  await filter.getByLabel('Cá', { exact: true }).check()
  await expect(filter.getByText('1 đã chọn', { exact: true })).toBeVisible()
  await expect(page.getByText('2 công thức phù hợp', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cơm cá phi lê sốt cà chua' })).toHaveCount(0)
  await page.screenshot({ path: 'docs/screenshots/dish-allergen-filter-desktop.png', fullPage: false })

  await filter.getByRole('button', { name: 'Bỏ chọn tất cả' }).click()
  await expect(filter.getByText('Chưa chọn', { exact: true })).toBeVisible()
  await expect(page.getByText('3 công thức phù hợp', { exact: true })).toBeVisible()

  const results = await new AxeBuilder({ page }).include('.dish-allergen-picker').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(violation => violation.id)).toEqual([])
})

test('bộ lọc dị nguyên dùng được trên màn hình 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openNutritionAssistant(page)

  const filter = page.getByRole('group', { name: 'Lọc tránh dị nguyên' })
  await filter.getByLabel('Sữa', { exact: true }).check()
  await expect(filter.getByText('1 đã chọn', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'docs/screenshots/dish-allergen-filter-mobile-390.png', fullPage: false })
})
