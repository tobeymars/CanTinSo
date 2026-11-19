import { getAccessToken, getStoredUser } from './authApi';
import { fetchMyKitchenContext } from './myKitchenApi';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
  const response = await fetch(`${BASE}${path}`, { ...init, headers: {
    Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers,
  }});
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(Array.isArray(body?.message) ? body.message.join(', ') : body?.message || 'Không thể thao tác thực đơn.'); }
  return response.json() as Promise<T>;
}
export type MealAgeGroup = { id: string; code: string; name: string; sortOrder: number };
export type ApprovedDishOption = { versionId: string; dishId: string; name: string; versionNo: number };
export type MealPlanRow = {
  id: string; schoolId: string; serviceDate: string; mealType: string; servings: number; status: string;
  school?: { id: string; name: string }; kitchen?: { id: string; name: string; code: string };
  revisions: Array<{ id: string; revisionNo: number; status: string; decisionNote?: string | null;
    ageGroups: Array<{ plannedServings: number; ageGroup: MealAgeGroup }>;
    items: Array<{ mealSlot: string; dishVersion: { versionNo: number; dish: { name: string } } }>;
  }>;
};
export async function loadMealPlanWorkspace() {
  const user = getStoredUser();
  const [ageGroups, plans] = await Promise.all([
    request<MealAgeGroup[]>('/meal-plans/age-groups'),
    request<MealPlanRow[]>('/meal-plans'),
  ]);
  if (user?.role !== 'CENTRAL_KITCHEN' && user?.role !== 'SCHOOL_KITCHEN') return { ageGroups, plans, schools: [], dishes: [] as ApprovedDishOption[] };
  const [context, rawDishes] = await Promise.all([
    fetchMyKitchenContext(),
    request<Array<{ id: string; name: string; versions: Array<{ id: string; versionNo: number; status: string; approvals?: Array<{ schoolId: string; status: string }> }> }>>('/dishes'),
  ]);
  const schools = (context.kitchen.schools ?? []).map(row => ({ id: row.school.id, name: row.school.name }));
  const dishes = rawDishes.flatMap(dish => (dish.versions ?? []).filter(version => version.approvals?.some(a => a.status === 'APPROVED')).map(version => ({
    versionId: version.id, dishId: dish.id, name: dish.name, versionNo: version.versionNo,
    approvedSchoolIds: version.approvals?.filter(a => a.status === 'APPROVED').map(a => a.schoolId) ?? [],
  }))).flatMap(item => item.approvedSchoolIds.map(schoolId => ({ ...item, schoolId })));
  return { ageGroups, plans, schools, dishes };
}
export async function createAndSubmitMealPlan(input: { schoolId: string; serviceDate: string; mealType: string; ageGroupId: string; servings: number; dishVersionIds: string[] }) {
  const revision = await request<{ id: string }>('/meal-plans', { method: 'POST', body: JSON.stringify({
    schoolId: input.schoolId, serviceDate: input.serviceDate, mealType: input.mealType,
    ageGroups: [{ ageGroupId: input.ageGroupId, plannedServings: input.servings }],
    items: input.dishVersionIds.map((dishVersionId, sequence) => ({ dishVersionId, mealSlot: input.mealType, sequence, isDefault: true })),
  })});
  return request(`/meal-plans/${revision.id}/submit`, { method: 'POST', body: '{}' });
}
export async function decideMealPlan(revisionId: string, decision: 'approve' | 'return', note = '') {
  return request(`/meal-plans/${revisionId}/${decision}`, { method: 'POST', body: JSON.stringify({ note }) });
}
