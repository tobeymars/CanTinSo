import { getAccessToken, getStoredUser } from './authApi';
import { fetchMyKitchenContext } from './myKitchenApi';
import { getManagedSchools, getMyAssignedSchool } from './usersApi';

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
export type ApprovedDishOption = { versionId: string; dishId: string; name: string; versionNo: number; schoolId?: string; ageBand?: string; portionWeightGrams?: number };
export type MealPlanRevisionHistory = {
  id: string; revisionNo: number; status: string; createdAt: string; submittedAt?: string | null; decidedAt?: string | null; decisionNote?: string | null;
  proposedBy?: { fullName: string; role: string }; decidedBy?: { fullName: string; role: string } | null;
  events: Array<{ eventType: string; note?: string | null; occurredAt: string; actor: { fullName: string; role: string } }>;
  ageGroups: Array<{ plannedServings: number; ageGroup: MealAgeGroup }>;
  items: Array<{ mealSlot: string; isDefault?: boolean; dishVersion: { versionNo: number; dish: { name: string } } }>;
};
export type MealPlanRow = {
  id: string; schoolId: string; serviceDate: string; mealType: string; servings: number; status: string;
  school?: { id: string; name: string }; kitchen?: { id: string; name: string; code: string };
  revisions: Array<{ id: string; revisionNo: number; status: string; decisionNote?: string | null;
    ageGroups: Array<{ plannedServings: number; ageGroup: MealAgeGroup }>;
    items: Array<{ mealSlot: string; isDefault?: boolean; dishVersion: { versionNo: number; recipeSnapshot?: Record<string, unknown> | null; ingredients?: Array<{ quantity: number | string; unitCode: string; ingredient: { name: string; code?: string } }>; dish: { name: string } } }>;
  }>;
};
export async function loadMealPlanWorkspace() {
  const user = getStoredUser();
  const [ageGroups, plans] = await Promise.all([
    request<MealAgeGroup[]>('/meal-plans/age-groups'),
    request<MealPlanRow[]>('/meal-plans'),
  ]);
  if (user?.role === 'SCHOOL_KITCHEN' && !user.kitchenId) {
    // Receiving/service staff sees the school's approved menu, without access
    // to dish editing or other schools served by the same central kitchen.
    const school = await getMyAssignedSchool();
    return { ageGroups, plans, schools: [{ id: school.id, name: school.name }], dishes: [] as ApprovedDishOption[] };
  }
  if (user?.role === 'UBND_ADMIN') {
    // Danh sách trường phải lấy từ hồ sơ trường, không suy ra từ thực đơn:
    // trường mới tạo chưa có meal plan vẫn cần xuất hiện trong bộ lọc UBND.
    const managedSchools = await getManagedSchools();
    const schools = managedSchools.map(school => ({ id: school.id, name: school.name }));
    return { ageGroups, plans, schools, dishes: [] as ApprovedDishOption[] };
  }
  if (user?.role !== 'CENTRAL_KITCHEN' && user?.role !== 'SCHOOL_KITCHEN') return { ageGroups, plans, schools: [], dishes: [] as ApprovedDishOption[] };
  const [context, rawDishes] = await Promise.all([
    fetchMyKitchenContext(),
    request<Array<{ id: string; name: string; versions: Array<{ id: string; versionNo: number; status: string; recipeSnapshot?: Record<string, unknown> | null; approvals?: Array<{ schoolId: string; status: string }> }> }>>('/dishes'),
  ]);
  // Bếp trung tâm phục vụ nhiều trường; bếp tại trường chỉ phục vụ trường sở hữu bếp.
  // Không lấy danh sách trường từ dữ liệu demo hoặc từ các thực đơn đã tạo.
  const schools = context.providerType === 'SCHOOL'
    ? (context.kitchen.schoolId && user.schoolId === context.kitchen.schoolId
        ? [{ id: context.kitchen.schoolId, name: (await getMyAssignedSchool()).name }]
        : [])
    : (context.kitchen.schools ?? []).map(row => ({ id: row.school.id, name: row.school.name }));
  const dishes = rawDishes.flatMap(dish => (dish.versions ?? []).filter(version => version.approvals?.some(a => a.status === 'APPROVED')).map(version => ({
    versionId: version.id, dishId: dish.id, name: dish.name, versionNo: version.versionNo,
    ageBand: typeof version.recipeSnapshot?.ageBand === 'string' ? version.recipeSnapshot.ageBand : undefined,
    portionWeightGrams: typeof version.recipeSnapshot?.portionWeightGrams === 'number' ? version.recipeSnapshot.portionWeightGrams : undefined,
    approvedSchoolIds: version.approvals?.filter(a => a.status === 'APPROVED').map(a => a.schoolId) ?? [],
  }))).flatMap(item => item.approvedSchoolIds.map(schoolId => ({ ...item, schoolId })));
  return { ageGroups, plans, schools, dishes };
}
export async function loadMealPlanHistory(mealPlanId: string) { return request<{ id: string; serviceDate: string; mealType: string; school?: { name: string }; revisions: MealPlanRevisionHistory[] }>(`/meal-plans/${mealPlanId}/history`); }
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
