import { getAccessToken } from './authApi'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

export type NutritionPreviewIngredient = {
  ingredientId: string
  ingredientName: string
  quantity: number
  unitCode: string
}

export type BackendNutritionSnapshot = {
  calculationMethod: string
  calculatedAt: string
  reference: {
    code: string
    title: string
    documentNo: string
    appendix: string
    sourceUrl: string
    effectiveAt: string
  } | null
  totals: {
    energyKcal: number | null
    proteinG: number | null
    fatG: number | null
    carbohydrateG: number | null
    fiberG: number | null
    calciumMg: number | null
    ironMg: number | null
    zincMg: number | null
    vitaminARaeMcg: number | null
  }
  coverage: {
    ingredientCount: number
    calculatedCount: number
    missingProfileCount: number
    unsupportedUnitCount: number
    complete: boolean
  }
  ingredients: Array<{
    ingredientId?: string
    ingredientCode?: string
    ingredientName: string
    edibleWeightG?: number
    sourceRowNo?: number | null
    contribution?: Record<string, number | null>
    status: string
  }>
  warnings: string[]
}

export async function previewDishNutrition(ingredients: NutritionPreviewIngredient[]): Promise<BackendNutritionSnapshot> {
  const token = getAccessToken()
  if (!token) throw new Error('Chưa đăng nhập backend bằng tài khoản bếp.')
  const response = await fetch(`${API_BASE_URL}/dishes/nutrition-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ingredients }),
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
    throw new Error(message || 'Không thể tính dinh dưỡng từ backend.')
  }
  return body as BackendNutritionSnapshot
}
