import { expect, test } from '@playwright/test'

test('parent school-meal overview shows the issued QR for the current dish', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/')

  const qr = page.getByRole('link', { name: /Mở chi tiết QR món Mì xào gà/ })
  await expect(qr).toBeVisible()
  await expect(qr.locator('.journey-ready-qr-code svg')).toBeVisible()
  await expect(qr.getByText('1 món có QR')).toBeVisible()
  await expect(page.getByText('QR từng món chưa được phát hành')).toHaveCount(0)

  await qr.click()
  await expect(page.getByRole('heading', { name: 'Mì xào gà' }).first()).toBeVisible()
  await expect(page.getByText('MỖI QR · MỘT MÓN ĂN · DEMO')).toBeVisible()
})

test('safety supervision covers breakfast and lunch with one QR per dish', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/giam-sat')

  const mealSwitch = page.getByRole('group', { name: 'Chọn bữa cần giám sát' })
  const dailyMenu = page.locator('.supervision-daily-menu')
  await expect(dailyMenu).toBeVisible()
  await expect(dailyMenu.getByRole('heading', { name: 'Danh sách thực đơn ngày' })).toBeVisible()
  await expect(page.getByText('HÌNH ẢNH MINH HỌA GIÁM SÁT')).toHaveCount(0)
  await expect(page.locator('.supervision-daily-menu-grid>article')).toHaveCount(3)
  await expect(dailyMenu.getByText('Ăn sáng', { exact: true })).toBeVisible()
  await expect(dailyMenu.getByText('Ăn trưa', { exact: true })).toBeVisible()
  await expect(dailyMenu.getByText('Ăn xế', { exact: true })).toBeVisible()
  await expect(dailyMenu.getByText('Mì xào gà', { exact: true })).toBeVisible()
  await expect(dailyMenu.getByText('320 g/suất', { exact: true })).toBeVisible()
  await expect(mealSwitch.getByRole('button', { name: 'Bữa trưa' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.timeline-item').filter({ hasText: 'Sẵn sàng phục vụ' }).getByText('10:45')).toBeVisible()
  await expect(page.getByText(/món có QR/)).toBeVisible()

  await mealSwitch.getByRole('button', { name: 'Bữa sáng' }).click()
  await expect(mealSwitch.getByRole('button', { name: 'Bữa sáng' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.timeline-item').filter({ hasText: 'Xuất bếp' }).getByText('06:30')).toBeVisible()
  await expect(page.locator('.timeline-item').filter({ hasText: 'Sẵn sàng phục vụ' }).getByText('07:15')).toBeVisible()

  const registry = await page.evaluate(() => {
    const database = JSON.parse(localStorage.getItem('demo-dish-qr-v2') ?? '{}') as {
      records?: Array<{ mealType: string; dishName: string; publicToken: string }>
    }
    const records = database.records ?? []
    return {
      meals: [...new Set(records.map(record => record.mealType))].sort(),
      uniqueTokens: new Set(records.map(record => record.publicToken)).size,
      uniqueMealDishes: new Set(records.map(record => `${record.mealType}:${record.dishName}`)).size,
      count: records.length,
    }
  })
  expect(registry.meals).toEqual(['BREAKFAST', 'LUNCH'])
  expect(registry.uniqueTokens).toBe(registry.count)
  expect(registry.uniqueMealDishes).toBe(registry.count)

  const qr = page.getByRole('link', { name: /Mở chi tiết QR món/ })
  await expect(qr.locator('.journey-ready-qr-code svg')).toBeVisible()
  const dishName = (await qr.locator('.journey-ready-qr-copy strong').textContent())?.trim()
  await qr.click()
  await expect(page.getByRole('heading', { name: dishName! }).first()).toBeVisible()
  await expect(page.getByText('MỖI QR · MỘT MÓN ĂN · DEMO')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Chi tiết riêng của món' })).toBeVisible()
  await expect(page.getByText(/QR này chỉ hiển thị định lượng và nguyên liệu liên quan trực tiếp/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('central kitchen issues one QR for each lunch dish', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: 'Bếp trung tâm', exact: true }).click()
  await page.getByRole('link', { name: 'QR từng món ăn', exact: true }).click()
  await expect(page.getByRole('heading', { name: /QR món ăn/ })).toBeVisible()

  const issue = page.getByRole('button', { name: /Phát hành \d+ QR món DEMO/ })
  await expect(issue).toBeEnabled()
  const expected = Number((await issue.textContent())?.match(/\d+/)?.[0])
  await issue.click()
  await expect(page.getByText(new RegExp(`${expected} QR hoạt động / ${expected} món`))).toBeVisible()
  await expect(page.getByRole('button', { name: /Suất #/ })).toHaveCount(0)
  await expect(page.locator('.portion-token-list button')).toHaveCount(expected)
})
