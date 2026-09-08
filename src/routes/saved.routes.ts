import { Router, Request, Response } from 'express'
import mongoose from 'mongoose'
import protect from '../middlewares/auth.middleware'
import SavedItem from '../models/SavedItem.model'
import { enrichRestaurants, publicRestaurant } from '../utils/discovery'

const router = Router()
router.use('/saved', protect)
router.get('/saved', async (req: Request, res: Response) => {
  const items = await SavedItem.find({ userId: req.user?.id }).sort({ createdAt: -1 }).lean()
  const restaurants = await Promise.all([...new Set(items.map(item => String(item.restaurantId)))].map(publicRestaurant))
  const enriched = await enrichRestaurants(restaurants.filter(Boolean))
  res.json({ success: true, items: items.flatMap(item => {
    const restaurant = enriched.find(value => String(value._id) === String(item.restaurantId))
    if (!restaurant || (item.dishId && !restaurant.dishes.some((dish: any) => String(dish._id) === item.dishId))) return []
    return [{ restaurant, dishId: item.dishId }]
  }) })
})
router.put('/saved/:restaurantId', async (req: Request, res: Response) => {
  const restaurantId = String(req.params.restaurantId), dishId = String(req.body?.dishId || '')
  if (!mongoose.isValidObjectId(restaurantId) || (dishId && !mongoose.isValidObjectId(dishId))) {
    res.status(400).json({ success: false, message: 'Invalid restaurant or dish' }); return
  }
  const restaurant = await publicRestaurant(restaurantId)
  if (!restaurant || (dishId && !restaurant.dishes?.some(dish => String(dish._id) === dishId && dish.isActive !== false))) {
    res.status(404).json({ success: false, message: 'Restaurant or dish unavailable' }); return
  }
  await SavedItem.updateOne({ userId: req.user?.id, restaurantId, dishId }, { $setOnInsert: { userId: req.user?.id, restaurantId, dishId } }, { upsert: true })
  res.json({ success: true })
})
router.delete('/saved/:restaurantId', async (req: Request, res: Response) => {
  const restaurantId = String(req.params.restaurantId), dishId = String(req.query.dishId || '')
  if (!mongoose.isValidObjectId(restaurantId)) { res.status(400).json({ success: false, message: 'Invalid restaurant' }); return }
  await SavedItem.deleteOne({ userId: req.user?.id, restaurantId, dishId })
  res.json({ success: true })
})
export default router
