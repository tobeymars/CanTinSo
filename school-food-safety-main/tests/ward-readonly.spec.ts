import { expect, test } from '@playwright/test'

const wardModules = [
  'Tổng quan điều hành',
  'Thực đơn & bữa ăn',
  'Giám sát & an toàn',
  'Hồ sơ pháp lý & điều kiện bếp',
  'Tiến trình suất ăn',
  'Nhân sự & phân ca',
  'QR từng món ăn',
  'Quản lý kho',
  'Nhà cung cấp',
  'Xuất nhập tồn',
  'Phản ánh & góp ý',
  'Báo cáo tổng hợp',
] as const

test('Phòng VH-XH sees every monitoring module without operational actions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Chuyển không gian làm việc' }).click()
  await page.getByRole('button', { name: 'Phòng Văn hóa – Xã hội', exact: true }).click()

  const sidebar = page.locator('.sidebar nav')
  for (const module of wardModules) {
    await expect(sidebar.getByRole('link', { name: module, exact: true }), module).toBeVisible()
  }
  await expect(page.getByText('Giám sát toàn địa bàn · Chỉ đọc')).toBeVisible()
  await expect(page.getByText(/không được tạo, sửa, xóa, xác nhận hoặc phát hành/)).toBeVisible()

  await sidebar.getByRole('link', { name: 'Nhân sự & phân ca', exact: true }).click()
  await expect(page.locator('.hrm-page').getByRole('heading', { name: 'Nhân sự & phân ca' })).toBeVisible()
  await expect(page.getByText(/không được thêm, sửa, xóa hoặc phân ca/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thêm nhân sự' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Lịch phân ca', exact: true }).click()
  await expect(page.locator('.hrm-shift').first()).toBeDisabled()
  await expect(page.getByRole('button', { name: /^Phân ca / })).toHaveCount(0)

  await sidebar.getByRole('link', { name: 'QR từng món ăn', exact: true }).click()
  await expect(page.getByText('Phòng VH–XH · Chế độ giám sát chỉ đọc')).toBeVisible()
  await expect(page.getByRole('button', { name: /Phát hành|Thu hồi & cấp lại|Chuẩn bị bản in/ })).toHaveCount(0)

  await sidebar.getByRole('link', { name: 'Quản lý kho', exact: true }).click()
  await expect(page.getByText(/Chế độ giám sát chỉ đọc/)).toBeVisible()
  await expect(page.locator('.management-page-header').getByRole('button', { name: 'Xuất kho', exact: true })).toHaveCount(0)

  await sidebar.getByRole('link', { name: 'Nhà cung cấp', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quản lý nhà cung cấp' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thêm nhà cung cấp' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Sửa / })).toHaveCount(0)

  await sidebar.getByRole('link', { name: 'Xuất nhập tồn', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Xuất – nhập – tồn nguyên liệu' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Lưu phiếu DEMO' })).toHaveCount(0)
})
