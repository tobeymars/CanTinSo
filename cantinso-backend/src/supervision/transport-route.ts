/**
 * Khoảng cách đường bộ dự kiến giữa bếp và trường, không phải GPS thực đi.
 * Gọi Routes API từ backend (không công khai API key trên frontend).
 * Khi thiếu khóa, địa chỉ, hoặc tuyến đường: trả null; tuyệt đối không
 * tính khoảng cách đường chim bay hay tự điền số km giả.
 */
const routeCache = new Map<string, {value: number | null; expires: number}>()
const DAY = 24 * 60 * 60 * 1000
export async function estimatedDrivingDistanceKm(origin?: string | null, destination?: string | null): Promise<number | null> {
  const key = process.env.GOOGLE_ROUTES_API_KEY?.trim()
  if (!key || !origin?.trim() || !destination?.trim()) return null
  const start = origin.trim()
  const end = destination.trim()
  const cacheKey = JSON.stringify([start,end])
  const cached = routeCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.value
  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: {address: start},
        destination: {address: end},
        travelMode: 'DRIVE',
        languageCode: 'vi',
        regionCode: 'VN',
      }),
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return null
    const result = await response.json() as {routes?: Array<{distanceMeters?: number}>}
    const meters = result.routes?.[0]?.distanceMeters
    const value = typeof meters === 'number' && Number.isFinite(meters) && meters >= 0
      ? Math.round(meters / 100) / 10 : null
    if (routeCache.size > 1000) routeCache.clear()
    routeCache.set(cacheKey, {value,expires:Date.now() + DAY})
    return value
  } catch {
    // Bản thử nghiệm: lỗi nhà cung cấp bản đồ không được làm hỏng hồ sơ giám sát.
    return null
  }
}
