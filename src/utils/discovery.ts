import Deal from '../models/Deal.model'
import Review from '../models/Review.model'

export const publicRestaurantFilter = {
  $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }],
}

export const escapeSearch = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function distanceKm(lat: number, lng: number, toLat: number, toLng: number) {
  const rad = (value: number) => value * Math.PI / 180
  const a = Math.sin(rad(toLat - lat) / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(toLat)) * Math.sin(rad(toLng - lng) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
}

export const validCoordinates = (lat: unknown, lng: unknown) =>
  typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
  typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180

/** Public statistics always come from persisted reviews, including dish totals. */
export async function enrichRestaurants(restaurants: any[]) {
  if (!restaurants.length) return []
  const ids = restaurants.map(item => item._id)
  const stats = await Review.aggregate([
    { $match: { dealID: { $in: ids } } },
    { $group: { _id: { restaurant: '$dealID', dish: '$dishID' },
      count: { $sum: 1 }, total: { $sum: '$ratings' } } },
  ])
  return restaurants.map(restaurant => {
    const rows = stats.filter(row => String(row._id.restaurant) === String(restaurant._id))
    const reviewCount = rows.reduce((sum, row) => sum + row.count, 0)
    return {
      ...restaurant,
      reviewCount,
      rating: reviewCount ? rows.reduce((sum, row) => sum + row.total, 0) / reviewCount : 0,
      dishes: (restaurant.dishes || []).filter((dish: any) => dish.isActive !== false).map((dish: any) => {
        const row = rows.find(item => String(item._id.dish) === String(dish._id))
        return { ...dish, rating: row ? row.total / row.count : 0, reviewCount: row?.count || 0 }
      }),
    }
  })
}

export async function publicRestaurant(id: string) {
  return Deal.findOne({ _id: id, ...publicRestaurantFilter,
    $and: [{ $or: [{ status: 'activate' }, { opensAt: { $gt: new Date() } }] }],
  }).populate('category').lean()
}
