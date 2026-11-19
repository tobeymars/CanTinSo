import type { BoardingMealType, KitchenDishProposal, GradeLevel } from './boardingMenu'
import type { SchoolAgeBand } from './schoolNutrition'
import { getAccessToken } from './authApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

export type IngredientCatalogItem = { id: string; code: string; name: string; unit: string; category: string | null }
type ApiIngredient = { id: string; ingredientId?: string; quantity: string | number; unitCode: string; preparationNote?: string | null; ingredient?: { id: string; code: string; name: string; unit: string } }
type ApiDish = {
  id: string; code: string; name: string; category: string | null; kitchenId: string; createdAt: string
  versions: Array<{
    id: string; versionNo: number; status: string; createdAt: string
    recipeSnapshot: Record<string, unknown> | null
    ingredients: ApiIngredient[]
    approvals?: Array<{ id: string; schoolId: string; status: string; school?: { id: string; name: string } }>
  }>
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  if (!token) throw new Error('Phiên đăng nhập hệ thống không tồn tại. Vui lòng đăng nhập lại.')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Không thể thao tác với dữ liệu máy chủ.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi').trim()
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' ? value : Number(value ?? fallback) || fallback

export async function listKitchenDishes(schoolId: string, role: 'central_kitchen' | 'school_kitchen'): Promise<KitchenDishProposal[]> {
  const rows = await request<ApiDish[]>('/dishes')
  return rows.map(dish => {
    const version = dish.versions?.[0]
    const snapshot = (version?.recipeSnapshot ?? {}) as Record<string, unknown>
    const ingredientRecords = (version?.ingredients ?? []).map(row => {
      const ingredient = row.ingredient
      return {
        name: ingredient?.name ?? 'Nguyên liệu',
        ingredientCode: ingredient?.code ?? '',
        amountPerServing: asNumber(row.quantity),
        unit: row.unitCode === 'ml' ? 'ml' as const : 'g' as const,
        supplier: '',
        lotCode: '',
        origin: '',
      }
    })
    return {
      id: dish.id,
      code: dish.code,
      schoolId,
      kitchenId: dish.kitchenId,
      createdBy: role,
      mealType: (snapshot.mealType as BoardingMealType) || 'LUNCH',
      gradeLevel: (snapshot.gradeLevel as GradeLevel) || 'PRIMARY',
      ageBand: snapshot.ageBand as SchoolAgeBand | undefined,
      name: asString(snapshot.name, dish.name),
      description: asString(snapshot.description, dish.category ?? ''),
      imageUrl: asString(snapshot.imageUrl) || undefined,
      expectedQuantity: asNumber(snapshot.expectedQuantity),
      portionWeightGrams: asNumber(snapshot.portionWeightGrams),
      priority: asNumber(snapshot.priority, 1),
      ingredientRecords,
      safetyMonitoring: (snapshot.safetyMonitoring as KitchenDishProposal['safetyMonitoring']) ?? {
        threeStep: 'NOT_RECORDED', retainedSample: 'NOT_RECORDED', supervisor: '', recordedAt: '', note: '',
      },
      createdAt: dish.createdAt,
      updatedAt: version?.createdAt ?? dish.createdAt,
      demo: false,
    }
  })
}

export async function listIngredientCatalog(): Promise<IngredientCatalogItem[]> {
  return request<IngredientCatalogItem[]>('/dishes/ingredients')
}

export async function saveKitchenDish(input: {
  value: KitchenDishProposal | null
  name: string
  description: string
  mealType: BoardingMealType
  gradeLevel: GradeLevel
  ageBand: SchoolAgeBand
  imageUrl: string
  expectedQuantity: number
  portionWeightGrams: number
  priority: number
  safetyMonitoring: KitchenDishProposal['safetyMonitoring']
  ingredients: Array<{ name: string; quantity: number; unitCode: string }>
  ingredientCatalog: IngredientCatalogItem[]
  schoolIds: string[]
}) {
  const { value } = input
  const byName = new Map(input.ingredientCatalog.map(item => [normalize(item.name), item]))
  const resolved = input.ingredients.map(item => {
    const catalog = byName.get(normalize(item.name))
    if (!catalog) throw new Error(`Nguyên liệu "${item.name}" chưa có trong danh mục chuẩn của hệ thống. Hãy chọn tên nguyên liệu trong danh mục.`)
    return { ingredientId: catalog.id, quantity: item.quantity, unitCode: item.unitCode }
  })
  const schoolIds = [...new Set(input.schoolIds)]
  const code = value?.id ? value.code : `DISH-${Date.now()}`
  const metadata = {
    code: code ?? `DISH-${Date.now()}`,
    name: input.name,
    category: input.description.slice(0, 100) || undefined,
  }
  let dishId = value?.id
  if (!dishId) {
    const created = await request<{ id: string }>('/dishes', { method: 'POST', body: JSON.stringify(metadata) })
    dishId = created.id
  } else {
    await request(`/dishes/${dishId}`, { method: 'PATCH', body: JSON.stringify(metadata) })
  }
  const recipeSnapshot = {
    name: input.name,
    description: input.description,
    mealType: input.mealType,
    gradeLevel: input.gradeLevel,
    ageBand: input.ageBand,
    imageUrl: input.imageUrl,
    expectedQuantity: input.expectedQuantity,
    portionWeightGrams: input.portionWeightGrams,
    priority: input.priority,
    safetyMonitoring: input.safetyMonitoring,
  }
  const version = await request<{ id: string }>(`/dishes/${dishId}/versions`, {
    method: 'POST',
    body: JSON.stringify({
      recipeSnapshot,
      allergenSnapshot: {},
      ingredients: resolved,
    }),
  })
  let submitted = false
  if (schoolIds.length) {
    try {
      await request(`/dishes/${dishId}/versions/${version.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ schoolIds }),
      })
      submitted = true
    } catch {
      // Keep the successfully persisted version as a DRAFT if school routing is not ready.
    }
  }
  return { dishId, submitted }
}

export async function deleteKitchenDish(id: string) {
  return request<{ success: boolean; id: string }>(`/dishes/${id}`, { method: 'DELETE' })
}
