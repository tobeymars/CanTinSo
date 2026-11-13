import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function openBoardingMenu(page: import('@playwright/test').Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) <= 760
  await page.goto('/')
  await page.getByRole('button', { name: mobile ? 'Tài khoản' : 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: 'Ban Giám hiệu', exact: true }).click()
  await page.getByRole('link', { name: mobile ? 'Thực đơn' : 'Thực đơn & bữa ăn', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Lịch thực đơn 7 ngày và 3 bữa' })).toBeVisible()
}

test('BGH adds, previews, edits and deletes a boarding dish', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openBoardingMenu(page)
  await expect(page.getByText('/21 ô bữa ăn')).toBeVisible()
  const table = page.getByRole('table', { name: 'Lịch thực đơn 7 ngày và 3 bữa' })
  await expect(table.getByRole('columnheader')).toHaveCount(8)
  await expect(table.getByRole('rowheader')).toHaveCount(3)

  const addButton = table.getByRole('button', { name: /^Thêm món/ }).first()
  await expect(addButton).toBeEnabled()
  await addButton.click()
  const dialog = page.getByRole('dialog', { name: 'Thêm món bán trú' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Đơn vị chuẩn bị cho bữa ăn', { exact: true })).toHaveCount(0)
  await expect(dialog.getByLabel('Chọn nhanh món ăn mẫu')).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: /Tên món/ })).toHaveCount(0)
  await expect(dialog.getByRole('textbox', { name: 'Thành phần' })).toHaveCount(0)
  await expect(dialog.getByRole('textbox', { name: 'Mô tả' })).toHaveCount(0)
  await expect(dialog.getByText('Định lượng & truy xuất nguồn gốc', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Nhật ký giám sát an toàn', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Ảnh minh họa món ăn', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('Tải ảnh minh họa món ăn')).toBeAttached()
  await expect(dialog.getByLabel('Thứ tự ưu tiên')).toHaveCount(0)
  await expect(dialog.getByLabel('Số lượng dự kiến')).toHaveCount(0)
  await dialog.getByLabel('Chọn nhanh món ăn mẫu').click()
  await page.getByRole('option', { name: 'Bún bò rau xanh' }).click()
  await expect(dialog.getByRole('heading', { name: 'Bún bò rau xanh' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Lưu món' }).click()
  await expect(page.getByText('Đã thêm món vào 1 ngày áp dụng.')).toBeVisible()
  await expect(table.getByText('Bún bò rau xanh')).toBeVisible()

  await table.getByRole('button', { name: 'Chỉnh sửa Bún bò rau xanh' }).click()
  const editDialog = page.getByRole('dialog', { name: 'Chỉnh sửa món bán trú' })
  await editDialog.getByRole('textbox', { name: /Tên món/ }).fill('Phở gà nấm hương')
  await editDialog.getByRole('button', { name: 'Lưu món' }).click()
  await expect(table.getByText('Phở gà nấm hương')).toBeVisible()
  await table.getByRole('button', { name: 'Xóa Phở gà nấm hương' }).click()
  await page.getByRole('dialog', { name: 'Xác nhận xóa món' }).getByRole('button', { name: 'Xóa món' }).click()
  await expect(table.getByText('Phở gà nấm hương')).toHaveCount(0)

  await page.screenshot({ path: 'docs/screenshots/boarding-menu-1440.png', fullPage: true })
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(results.violations.map(violation => violation.id)).toEqual([])
})

test('boarding menu remains usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openBoardingMenu(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const scroll = page.getByLabel('Lịch thực đơn tuần, có thể cuộn ngang')
  await expect(scroll).toBeVisible()
  const addButton = scroll.getByRole('button', { name: /^Thêm món/ }).first()
  await expect(addButton).toBeEnabled()
  await addButton.click()
  const dialog = page.getByRole('dialog', { name: 'Thêm món bán trú' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Đơn vị chuẩn bị cho bữa ăn', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Xem trước bên phụ huynh')).toBeVisible()
  await expect(dialog.getByLabel('Chọn nhanh món ăn mẫu')).toBeVisible()
  await expect(dialog.getByText('Ảnh minh họa món ăn', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: /Tên món/ })).toHaveCount(0)
  await page.screenshot({ path: 'docs/screenshots/boarding-menu-editor-390.png', fullPage: true })
  await dialog.getByRole('button', { name: 'Đóng' }).click()
  await page.screenshot({ path: 'docs/screenshots/boarding-menu-390.png', fullPage: true })
})

test('parent independently changes dishes for breakfast, lunch and snack', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/bua-an')
  await expect(page.getByText('Mỗi ô chỉ hiện một món. Nút Đổi món cho biết số phương án khác; bữa chưa chọn sẽ dùng món mặc định của trường.')).toBeVisible()

  const choices = [
    { meal: 'ăn sáng', row: 'Ăn sáng', dish: 'Bánh mì trứng rau' },
    { meal: 'ăn trưa', row: 'Ăn trưa', dish: 'Đậu hũ sốt nấm' },
    { meal: 'ăn xế', row: 'Ăn xế', dish: 'Bánh chuối và sữa' },
  ]
  for (const choice of choices) {
    const row = page.getByRole('table', { name: 'Lịch thực đơn 7 ngày và 3 bữa' }).getByRole('row').filter({ has: page.getByRole('rowheader', { name: choice.row }) })
    const mondayCell = row.getByRole('cell').first()
    await expect(mondayCell.locator('.calendar-dish')).toHaveCount(1)
    const changeButton = mondayCell.getByRole('button', { name: new RegExp(`Đổi món ${choice.meal}.*1 món khác`, 'i') })
    await expect(changeButton).toContainText('1')
    await expect(mondayCell.getByText(choice.dish, { exact: true })).toHaveCount(0)
    await changeButton.click()
    const picker = page.getByRole('dialog', { name: new RegExp(`Đổi món ${choice.meal} ngày`, 'i') })
    await expect(picker.getByRole('button')).toHaveCount(3)
    if (choice.row === 'Ăn sáng') {
      const accessibility = await new AxeBuilder({ page }).include('.parent-choice-dialog').withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(accessibility.violations).toEqual([])
    }
    await picker.getByRole('button', { name: `Chọn món ${choice.dish}` }).click()
    await expect(page.getByRole('status')).toContainText(`cho ${choice.meal}`)
    await expect(mondayCell.getByText(choice.dish, { exact: true })).toBeVisible()
    await expect(mondayCell.locator('.calendar-dish')).toHaveCount(1)
  }

  await page.reload()
  for (const choice of choices) {
    const row = page.getByRole('table', { name: 'Lịch thực đơn 7 ngày và 3 bữa' }).getByRole('row').filter({ has: page.getByRole('rowheader', { name: choice.row }) })
    const mondayCell = row.getByRole('cell').first()
    await expect(mondayCell.getByText(choice.dish, { exact: true })).toBeVisible()
    await expect(mondayCell.locator('.calendar-dish')).toHaveCount(1)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'docs/screenshots/parent-three-meal-choice-390.png', fullPage: true })
})

test('BGH menu starts at the compact controls and keeps dish cards aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openBoardingMenu(page)
  await expect(page.getByText('KHÔNG GIAN BAN GIÁM HIỆU', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Thực đơn do BGH lập', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Thiết lập thực đơn hằng ngày và hằng tuần' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Bếp trung tâm & bếp tại trường' })).toHaveCount(0)

  const breakfastRow = page.getByRole('table', { name: 'Lịch thực đơn 7 ngày và 3 bữa' }).getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Ăn sáng' }) })
  const metrics = await breakfastRow.getByRole('cell').evaluateAll(cells => cells.map(cell => Array.from(cell.querySelectorAll<HTMLElement>('.calendar-dish')).map(card => ({ top: Math.round(card.getBoundingClientRect().top), height: Math.round(card.getBoundingClientRect().height) }))))
  expect(new Set(metrics.map(cards => cards[0]?.top)).size).toBe(1)
  expect(new Set(metrics.map(cards => cards[0]?.height)).size).toBe(1)
  expect(new Set(metrics.map(cards => cards[1]?.top)).size).toBe(1)
  expect(new Set(metrics.map(cards => cards[1]?.height)).size).toBe(1)
})

test('central and on-site kitchen managers only edit menus in their service mode', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: 'Bếp trung tâm', exact: true }).click()
  await page.getByRole('link', { name: 'Thực đơn & bữa ăn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bếp trung tâm', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lên thực đơn tuần' })).toBeVisible()

  await page.getByRole('button', { name: 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: 'Bếp nấu tại trường', exact: true }).click()
  await page.getByRole('link', { name: 'Thực đơn & bữa ăn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bếp tại trường', exact: true })).toBeVisible()
  await expect(page.getByText('Bếp tại trường Mầm non Bình An')).toBeVisible()
  await page.getByRole('button', { name: 'Lên thực đơn ngày' }).click()
  const dialog = page.getByRole('dialog', { name: 'Lên thực đơn ngày' })
  await expect(dialog.getByText('Bếp tại trường', { exact: true })).toBeVisible()
})

test('all related operational roles use the new table with read-only permissions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  for (const role of ['Bếp trưởng · Bếp trung tâm', 'Nhân viên tiếp nhận tại trường', 'Nhân viên ra món', 'Phòng Văn hóa – Xã hội']) {
    await page.getByRole('button', { name: 'Chuyển không gian làm việc' }).click()
    await page.getByRole('button', { name: role, exact: true }).click()
    await page.getByRole('link', { name: 'Thực đơn & bữa ăn', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Thực đơn tuần theo phạm vi được giao' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Lịch thực đơn 7 ngày và 3 bữa' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Xem bản công khai' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Lên thực đơn ngày|Lên thực đơn tuần|Thêm bếp|Thêm món ăn|Chỉnh sửa|Xóa/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Thực đơn cả tuần' })).toHaveCount(0)
  }
})
