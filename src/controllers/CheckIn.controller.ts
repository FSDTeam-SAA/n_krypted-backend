import { NextFunction, Request, Response } from 'express'
import mongoose from 'mongoose'
import CheckIn from '../models/CheckIn.model'
import Deal from '../models/Deal.model'
import { buildMetaPagination, getPaginationParams } from '../utils/pagination'

const MAX_CHECK_IN_DISTANCE_METERS = 100
const MAX_LOCATION_ACCURACY_METERS = 100

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const distanceInMeters = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const earthRadius = 6_371_000
  const latitudeDelta = toRadians(second.latitude - first.latitude)
  const longitudeDelta = toRadians(second.longitude - first.longitude)
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(first.latitude)) *
      Math.cos(toRadians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const validCoordinates = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180

const listCheckIns = async (
  req: Request,
  res: Response,
  baseFilter: Record<string, unknown>
) => {
  const { page, limit, skip } = getPaginationParams(req.query)
  const filter: Record<string, unknown> = { ...baseFilter }

  if (
    baseFilter.restaurantId === undefined &&
    typeof req.query.restaurantId === 'string'
  ) {
    if (!mongoose.isValidObjectId(req.query.restaurantId)) {
      res.status(400).json({ success: false, message: 'Invalid restaurant id' })
      return
    }
    filter.restaurantId = req.query.restaurantId
  }
  if (baseFilter.userId === undefined && typeof req.query.userId === 'string') {
    if (!mongoose.isValidObjectId(req.query.userId)) {
      res.status(400).json({ success: false, message: 'Invalid user id' })
      return
    }
    filter.userId = req.query.userId
  }

  const checkedInAt: Record<string, Date> = {}
  if (typeof req.query.from === 'string') {
    const from = new Date(req.query.from)
    if (!Number.isNaN(from.getTime())) checkedInAt.$gte = from
  }
  if (typeof req.query.to === 'string') {
    const to = new Date(req.query.to)
    if (!Number.isNaN(to.getTime())) checkedInAt.$lte = to
  }
  if (Object.keys(checkedInAt).length) filter.checkedInAt = checkedInAt

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [checkIns, totalItems, today] = await Promise.all([
    CheckIn.find(filter)
      .select('-userLocation')
      .populate('userId', 'name email avatar phoneNumber')
      .populate('restaurantId', 'title images location owner')
      .sort({ checkedInAt: -1 })
      .skip(skip)
      .limit(limit),
    CheckIn.countDocuments(filter),
    CheckIn.countDocuments({ ...baseFilter, checkedInAt: { $gte: todayStart } }),
  ])

  res.status(200).json({
    success: true,
    data: checkIns,
    meta: buildMetaPagination(totalItems, page, limit),
    stats: { total: totalItems, today },
  })
}

export const createCheckIn = async (req: Request, res: Response) => {
  const restaurantId = req.body?.restaurantId
  const latitude = Number(req.body?.latitude)
  const longitude = Number(req.body?.longitude)
  const accuracy =
    req.body?.accuracy === undefined ? undefined : Number(req.body.accuracy)
  const partySize = Number(req.body?.partySize)

  if (!mongoose.isValidObjectId(restaurantId)) {
    res.status(400).json({ success: false, message: 'Invalid restaurant id' })
    return
  }
  if (!validCoordinates(latitude, longitude)) {
    res.status(400).json({ success: false, message: 'A valid current location is required' })
    return
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 50) {
    res.status(400).json({ success: false, message: 'Party size must be between 1 and 50' })
    return
  }
  if (accuracy !== undefined && (!Number.isFinite(accuracy) || accuracy < 0)) {
    res.status(400).json({ success: false, message: 'Invalid location accuracy' })
    return
  }
  if (accuracy !== undefined && accuracy > MAX_LOCATION_ACCURACY_METERS) {
    res.status(422).json({
      success: false,
      message: 'Location is not accurate enough. Move outside or enable precise location and try again.',
      maxAccuracyMeters: MAX_LOCATION_ACCURACY_METERS,
    })
    return
  }

  const restaurant = await Deal.findOne({
    _id: restaurantId,
    status: 'activate',
    $or: [
      { approvalStatus: 'approved' },
      { approvalStatus: { $exists: false } },
    ],
  }).select('title location owner')

  if (!restaurant) {
    res.status(404).json({ success: false, message: 'Active restaurant not found' })
    return
  }

  const restaurantLatitude = Number(restaurant.location?.latitude)
  const restaurantLongitude = Number(restaurant.location?.longitude)
  if (!validCoordinates(restaurantLatitude, restaurantLongitude)) {
    res.status(409).json({
      success: false,
      message: 'This restaurant does not have a valid map location yet',
    })
    return
  }

  const distanceMeters = distanceInMeters(
    { latitude, longitude },
    { latitude: restaurantLatitude, longitude: restaurantLongitude }
  )

  if (distanceMeters > MAX_CHECK_IN_DISTANCE_METERS) {
    res.status(403).json({
      success: false,
      message: `You must be within ${MAX_CHECK_IN_DISTANCE_METERS} metres of the restaurant to check in`,
      distanceMeters: Math.round(distanceMeters),
      maxDistanceMeters: MAX_CHECK_IN_DISTANCE_METERS,
    })
    return
  }

  const checkIn = await CheckIn.create({
    userId: req.user?.id,
    restaurantId,
    partySize,
    userLocation: { latitude, longitude, accuracy },
    distanceMeters: Math.round(distanceMeters * 10) / 10,
    status: 'verified',
  })

  await checkIn.populate([
    { path: 'userId', select: 'name email avatar' },
    { path: 'restaurantId', select: 'title images location owner dishes' },
  ])

  res.status(201).json({
    success: true,
    message: 'Check-in verified successfully',
    data: checkIn,
    maxDistanceMeters: MAX_CHECK_IN_DISTANCE_METERS,
  })
}

export const getMyCheckIns = async (req: Request, res: Response) =>
  listCheckIns(req, res, { userId: req.user?.id })

export const getAdminCheckIns = async (req: Request, res: Response) =>
  listCheckIns(req, res, {})

export const getUserCheckIns = async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    res.status(400).json({ success: false, message: 'Invalid user id' })
    return
  }
  return listCheckIns(req, res, { userId: req.params.userId })
}

export const getOwnerCheckIns = async (req: Request, res: Response) => {
  const restaurants = await Deal.find({ owner: req.user?.id }).select('_id')
  return listCheckIns(req, res, {
    restaurantId: { $in: restaurants.map((restaurant) => restaurant._id) },
  })
}

export const checkInErrorBoundary = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof mongoose.Error) {
    res.status(400).json({ success: false, message: error.message })
    return
  }
  next(error)
}
