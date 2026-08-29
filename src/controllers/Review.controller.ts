import { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import Review from '../models/Review.model'
import CheckIn from '../models/CheckIn.model'
import User from '../models/User.model'
import Deal from '../models/Deal.model'
import { buildMetaPagination, getPaginationParams } from '../utils/pagination'

const reviewPopulate = [
  { path: 'userID', select: 'name email avatar' },
  {
    path: 'dealID',
    select: 'title images owner dishes location category',
    populate: { path: 'category', select: 'categoryName' },
  },
  { path: 'checkInID', select: 'checkedInAt partySize distanceMeters status' },
]

const ownerRestaurantIds = async (req: Request) => {
  if (req.user?.role !== 'restaurant_owner') return null
  const restaurants = await Deal.find({ owner: req.user.id }).select('_id').lean()
  return restaurants.map((restaurant) => restaurant._id)
}

export const getReviewEligibility = async (req: Request, res: Response) => {
  const { dealID } = req.params
  if (!mongoose.isValidObjectId(dealID)) {
    res.status(400).json({ success: false, message: 'Invalid restaurant id' })
    return
  }

  const usedCheckIns = await Review.distinct('checkInID', { userID: req.user?.id, dealID })
  const checkIn = await CheckIn.findOne({
    userId: req.user?.id,
    restaurantId: dealID,
    status: 'verified',
    _id: { $nin: usedCheckIns },
  })
    .sort({ checkedInAt: -1 })
    .populate('restaurantId', 'title dishes images')

  res.status(200).json({
    success: true,
    eligible: Boolean(checkIn),
    checkIn,
    message: checkIn
      ? 'Verified check-in found'
      : 'Check in at this restaurant before writing a review',
  })
}

export const createReview = async (req: Request, res: Response) => {
  const { dealID, checkInID, dishID } = req.body
  const reviewComment = req.body?.reviewComment?.toString().trim()
  const ratings = Number(req.body?.ratings)

  if (!mongoose.isValidObjectId(dealID) || !reviewComment || !Number.isInteger(ratings)) {
    res.status(400).json({ success: false, message: 'Restaurant, rating and review are required' })
    return
  }
  if (ratings < 1 || ratings > 5) {
    res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
    return
  }

  const usedCheckIns = await Review.distinct('checkInID', {
    userID: req.user?.id,
    dealID,
  })
  if (checkInID && !mongoose.isValidObjectId(checkInID)) {
    res.status(400).json({ success: false, message: 'Invalid check-in id' })
    return
  }
  const checkInFilter: Record<string, unknown> = {
    userId: req.user?.id,
    restaurantId: dealID,
    status: 'verified',
    _id: checkInID || { $nin: usedCheckIns },
  }

  const checkIn = await CheckIn.findOne(checkInFilter).sort({ checkedInAt: -1 })
  if (!checkIn) {
    res.status(403).json({
      success: false,
      message: 'A verified, unused check-in at this restaurant is required',
    })
    return
  }
  if (await Review.exists({ checkInID: checkIn._id })) {
    res.status(409).json({ success: false, message: 'This visit has already been reviewed' })
    return
  }

  let dishName: string | undefined
  let normalizedDishId: mongoose.Types.ObjectId | undefined
  if (dishID) {
    if (!mongoose.isValidObjectId(dishID)) {
      res.status(400).json({ success: false, message: 'Invalid dish id' })
      return
    }
    const restaurant = await Deal.findById(dealID).select('dishes')
    const dish = (restaurant?.dishes || []).find(
      (item: any) => item._id?.toString() === dishID && item.isActive !== false
    )
    if (!dish) {
      res.status(400).json({ success: false, message: 'Selected dish is not available' })
      return
    }
    normalizedDishId = new mongoose.Types.ObjectId(dishID)
    dishName = dish.name
  }

  const review = await Review.create({
    userID: req.user?.id,
    dealID,
    checkInID: checkIn._id,
    dishID: normalizedDishId,
    dishName,
    reviewComment,
    ratings,
  })
  await review.populate(reviewPopulate)
  res.status(201).json({ success: true, review })
}

export const getReviewsByDeal = async (req: Request, res: Response) => {
  const { dealID } = req.params
  if (!mongoose.isValidObjectId(dealID)) {
    res.status(400).json({ success: false, message: 'Invalid restaurant id' })
    return
  }
  const reviews = await Review.find({ dealID })
    .populate(reviewPopulate)
    .sort({ createdAt: -1 })
  res.status(200).json({ success: true, reviews })
}

export const updateReview = async (req: Request, res: Response) => {
  const review = await Review.findById(req.params.id)
  if (!review) {
    res.status(404).json({ success: false, message: 'Review not found' })
    return
  }
  if (review.userID.toString() !== req.user?.id && req.user?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Unauthorized' })
    return
  }

  const reviewComment = req.body?.reviewComment?.toString().trim()
  const ratings = req.body?.ratings === undefined ? review.ratings : Number(req.body.ratings)
  if (!reviewComment || !Number.isInteger(ratings) || ratings < 1 || ratings > 5) {
    res.status(400).json({ success: false, message: 'A valid rating and review are required' })
    return
  }
  review.reviewComment = reviewComment
  review.ratings = ratings
  await review.save()
  await review.populate(reviewPopulate)
  res.status(200).json({ success: true, review })
}

export const deleteReview = async (req: Request, res: Response) => {
  const review = await Review.findById(req.params.id).populate('dealID', 'owner')
  if (!review) {
    res.status(404).json({ success: false, message: 'Review not found' })
    return
  }
  const ownerId = (review.dealID as any)?.owner?.toString()
  if (
    review.userID.toString() !== req.user?.id &&
    req.user?.role !== 'admin' &&
    ownerId !== req.user?.id
  ) {
    res.status(403).json({ success: false, message: 'Unauthorized' })
    return
  }
  await review.deleteOne()
  res.status(200).json({ success: true, message: 'Review deleted' })
}

export const getDashboardStats = async (req: Request, res: Response) => {
  const currentYear = new Date().getFullYear()
  const yearStart = new Date(currentYear, 0, 1)
  const nextYearStart = new Date(currentYear + 1, 0, 1)
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const restaurantIds = await ownerRestaurantIds(req)
  const dealFilter = restaurantIds ? { _id: { $in: restaurantIds } } : {}
  const checkInFilter = restaurantIds ? { restaurantId: { $in: restaurantIds } } : {}
  const reviewFilter = restaurantIds ? { dealID: { $in: restaurantIds } } : {}

  const [totalCheckIns, customerIds, totalDeals, totalReviews, activeDeals, monthlyActivity, weeklyDeals] =
    await Promise.all([
      CheckIn.countDocuments(checkInFilter),
      CheckIn.distinct('userId', checkInFilter),
      Deal.countDocuments(dealFilter),
      Review.countDocuments(reviewFilter),
      Deal.countDocuments({ ...dealFilter, status: 'activate' }),
      restaurantIds
        ? CheckIn.aggregate([
            { $match: { ...checkInFilter, checkedInAt: { $gte: yearStart, $lt: nextYearStart } } },
            { $group: { _id: { $month: '$checkedInAt' }, users: { $sum: 1 } } },
          ])
        : User.aggregate([
            { $match: { createdAt: { $gte: yearStart, $lt: nextYearStart } } },
            { $group: { _id: { $month: '$createdAt' }, users: { $sum: 1 } } },
          ]),
      Deal.aggregate([
        { $match: { ...dealFilter, createdAt: { $gte: weekStart, $lt: weekEnd } } },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'activate'] }, 1, 0] } },
          },
        },
      ]),
    ])

  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  res.status(200).json({
    success: true,
    data: {
      totalCheckIns,
      totalCustomers: restaurantIds ? customerIds.length : await User.countDocuments(),
      totalDeals,
      totalReviews,
      activeDeals,
      userGrowthData: months.map((month, index) => ({
        month,
        users: monthlyActivity.find((item) => item._id === index + 1)?.users || 0,
      })),
      restaurantWeeklyData: days.map((day, index) => {
        const entry = weeklyDeals.find((item) => item._id === index + 1)
        return { day, active: entry?.active || 0, total: entry?.total || 0 }
      }),
    },
  })
}

export const getCategoryCheckInStats = async (_req: Request, res: Response) => {
  const stats = await CheckIn.aggregate([
    { $lookup: { from: 'deals', localField: 'restaurantId', foreignField: '_id', as: 'restaurant' } },
    { $unwind: '$restaurant' },
    { $lookup: { from: 'categories', localField: 'restaurant.category', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $group: { _id: '$category._id', name: { $first: '$category.categoryName' }, value: { $sum: 1 } } },
    { $sort: { value: -1 } },
  ])
  res.status(200).json(stats)
}

export const getAllReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query)
    const filter: Record<string, unknown> = {}
    if (typeof req.query.userId === 'string') filter.userID = req.query.userId
    if (typeof req.query.dealId === 'string') filter.dealID = req.query.dealId
    const restaurantIds = await ownerRestaurantIds(req)
    if (restaurantIds) filter.dealID = { $in: restaurantIds }

    const [reviews, totalItems] = await Promise.all([
      Review.find(filter).populate(reviewPopulate).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Review.countDocuments(filter),
    ])
    res.status(200).json({
      success: true,
      meta: buildMetaPagination(totalItems, page, limit),
      data: reviews,
    })
  } catch (error) {
    next(error)
  }
}

export const bulkDeleteReviews = async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids)] : []
  if (
    ids.length === 0 ||
    ids.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))
  ) {
    res.status(400).json({ success: false, message: 'A valid list of review ids is required' })
    return
  }
  const result = await Review.deleteMany({ _id: { $in: ids } })
  res.status(200).json({
    success: true,
    deletedCount: result.deletedCount,
    message: `${result.deletedCount} reviews deleted`,
  })
}
