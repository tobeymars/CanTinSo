import type { Locator } from '@playwright/test'

/** Chọn một mục trong Select dùng chung như người dùng: mở combobox rồi bấm đúng mục trong listbox mà nó điều khiển. */
export async function choose(combobox: Locator, option: string | { label: string }) {
  // Đọc listbox trước khi mở: khi mở, nhãn của combobox cũng khớp listbox cùng tên.
  const list = combobox.page().locator(`[id="${await combobox.getAttribute('aria-controls')}"]`)
  await combobox.click()
  await (typeof option === 'string' ? list.locator(`[data-value=${JSON.stringify(option)}]`) : list.getByRole('option', { name: option.label, exact: true })).click()
}
