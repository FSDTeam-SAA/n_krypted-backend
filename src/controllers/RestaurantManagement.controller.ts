import { Request, Response } from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Deal from "../models/Deal.model";
import User from "../models/User.model";
import CheckIn from "../models/CheckIn.model";
import Review from "../models/Review.model";
import cloudinary from "../utils/cloudinary";

const safeOwnerFields = "name email phoneNumber role";
const approvalStatuses = ["pending", "approved", "rejected"] as const;

const clean = (value: unknown) => value?.toString().trim() || "";
const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const booleanValue = (value: unknown, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  return value.toString().toLowerCase() === "true";
};

const stringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [];
  } catch {
    return [clean(value)].filter(Boolean);
  }
};

const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  if (!file.mimetype.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "n-krypted/restaurants" },
      (error, result) => {
        if (error) return reject(error);
        const imageUrl = result?.secure_url || "";
        return imageUrl ? resolve(imageUrl) : reject(new Error("Image upload failed"));
      },
    );
    stream.end(file.buffer);
  });
};

const restaurantFiles = (req: Request) =>
  req.files && Array.isArray(req.files)
    ? (req.files as Express.Multer.File[])
    : [];

const addRestaurantUploads = async (
  req: Request,
  payload: ReturnType<typeof restaurantPayload>,
) => {
  const uploadedImages = await Promise.all(restaurantFiles(req).map(uploadImage));
  payload.images = [...new Set([...uploadedImages, ...payload.images])].slice(0, 4);
};

const restaurantPayload = (body: Record<string, any>) => {
  const rawLocation =
    typeof body.location === "string" ? JSON.parse(body.location) : body.location || {};
  const latitude = numberValue(rawLocation.latitude);
  const longitude = numberValue(rawLocation.longitude);

  return {
    title: clean(body.title),
    shortDescription: clean(body.shortDescription) || clean(body.description).slice(0, 160),
    description: clean(body.description),
    price: numberValue(body.price) ?? 0,
    location: {
      address: clean(rawLocation.address),
      city: clean(rawLocation.city),
      country: clean(rawLocation.country),
      latitude,
      longitude,
    },
    images: stringArray(body.images),
    offers: stringArray(body.offers),
    category:
      body.category && mongoose.isValidObjectId(body.category)
        ? new mongoose.Types.ObjectId(body.category)
        : undefined,
  };
};

const validateRestaurant = (payload: ReturnType<typeof restaurantPayload>) => {
  if (!payload.title || !payload.description) return "Restaurant name and description are required";
  if (!payload.location.city || !payload.location.country || !payload.location.address) {
    return "Address, city and country are required";
  }
  if (payload.location.latitude === undefined || payload.location.longitude === undefined) {
    return "Please choose the restaurant location on the map";
  }
  if (
    payload.location.latitude < -90 ||
    payload.location.latitude > 90 ||
    payload.location.longitude < -180 ||
    payload.location.longitude > 180
  ) {
    return "Invalid map coordinates";
  }
  return null;
};

const canManage = (req: Request, restaurant: any) =>
  req.user?.role === "admin" || restaurant.owner?.toString() === req.user?.id;

const withRestaurantMetrics = async (restaurant: any) => {
  if (!restaurant) return restaurant;
  const [totalCheckIns, reviewStats] = await Promise.all([
    CheckIn.countDocuments({ restaurantId: restaurant._id, status: "verified" }),
    Review.aggregate([
      { $match: { dealID: restaurant._id } },
      { $group: { _id: "$dealID", reviewCount: { $sum: 1 }, rating: { $avg: "$ratings" } } },
    ]),
  ]);
  return {
    ...restaurant.toObject(),
    totalCheckIns,
    reviewCount: reviewStats[0]?.reviewCount || 0,
    rating: reviewStats[0]?.rating || 0,
  };
};

export const getMyRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await Deal.findOne({ owner: req.user?.id })
      .populate("category")
      .populate("owner", safeOwnerFields);
    res.status(200).json({ success: true, restaurant: await withRestaurantMetrics(restaurant) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load your restaurant", error: (error as Error).message });
  }
};

export const createOwnerRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    if (await Deal.exists({ owner: req.user?.id })) {
      res.status(409).json({ success: false, message: "You have already submitted a restaurant" });
      return;
    }
    const payload = restaurantPayload({
      ...req.body,
      images: req.body.existingImages ?? req.body.images,
    });
    const validationError = validateRestaurant(payload);
    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }
    await addRestaurantUploads(req, payload);
    if (!payload.images.length) {
      res.status(400).json({ success: false, message: "Please upload at least one restaurant image" });
      return;
    }
    const restaurant = await Deal.create({
      ...payload,
      owner: req.user?.id,
      approvalStatus: "pending",
      status: "deactivate",
      submittedAt: new Date(),
      scheduleDates: [],
      dishes: [],
    });
    res.status(201).json({ success: true, message: "Restaurant submitted for admin approval", restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to submit restaurant", error: (error as Error).message });
  }
};

export const resubmitOwnerRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await Deal.findOne({ _id: req.params.id, owner: req.user?.id });
    if (!restaurant) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    if (restaurant.approvalStatus !== "rejected") {
      res.status(409).json({ success: false, message: "Only a rejected restaurant can be edited and resubmitted" });
      return;
    }
    const payload = restaurantPayload({
      ...req.body,
      images: req.body.existingImages ?? req.body.images,
    });
    const validationError = validateRestaurant(payload);
    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }
    await addRestaurantUploads(req, payload);
    if (!payload.images.length) {
      res.status(400).json({ success: false, message: "Please upload at least one restaurant image" });
      return;
    }
    Object.assign(restaurant, payload, {
      approvalStatus: "pending",
      rejectionReason: undefined,
      submittedAt: new Date(),
      status: "deactivate",
    });
    await restaurant.save();
    res.status(200).json({ success: true, message: "Restaurant resubmitted for approval", restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to resubmit restaurant", error: (error as Error).message });
  }
};

export const createAdminRestaurant = async (req: Request, res: Response): Promise<void> => {
  let createdOwnerId: mongoose.Types.ObjectId | undefined;
  try {
    const ownerBody = typeof req.body.owner === "string"
      ? JSON.parse(req.body.owner)
      : req.body.owner || {};
    const name = clean(ownerBody.name);
    const email = clean(ownerBody.email).toLowerCase();
    const password = ownerBody.password?.toString() || "";
    if (!name || !email || password.length < 6) {
      res.status(400).json({ success: false, message: "Owner name, email and a password of at least 6 characters are required" });
      return;
    }
    const payload = restaurantPayload({
      ...req.body,
      images: req.body.existingImages ?? req.body.images,
    });
    const validationError = validateRestaurant(payload);
    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }
    await addRestaurantUploads(req, payload);
    if (!payload.images.length) {
      res.status(400).json({ success: false, message: "Please upload at least one restaurant image" });
      return;
    }

    let owner = await User.findOne({ email });
    if (owner && owner.role !== "restaurant_owner") {
      res.status(409).json({ success: false, message: "This email belongs to a non-owner account" });
      return;
    }
    if (!owner) {
      owner = await User.create({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        phoneNumber: clean(ownerBody.phoneNumber) || undefined,
        role: "restaurant_owner",
        isVerified: true,
      });
      createdOwnerId = owner._id as mongoose.Types.ObjectId;
    }
    if (await Deal.exists({ owner: owner._id })) {
      res.status(409).json({ success: false, message: "This owner already has a restaurant" });
      return;
    }

    const restaurant = await Deal.create({
      ...payload,
      owner: owner._id,
      approvalStatus: "approved",
      approvedAt: new Date(),
      approvedBy: req.user?.id,
      submittedAt: new Date(),
      status: "activate",
      scheduleDates: [],
      dishes: [],
    });
    await restaurant.populate("owner", safeOwnerFields);
    res.status(201).json({ success: true, message: "Restaurant and owner login created", restaurant });
  } catch (error) {
    if (createdOwnerId) await User.findByIdAndDelete(createdOwnerId).catch(() => undefined);
    res.status(500).json({ success: false, message: "Failed to create restaurant", error: (error as Error).message });
  }
};

export const updateAdminRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await Deal.findById(req.params.id);
    if (!restaurant || !canManage(req, restaurant)) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    const payload = restaurantPayload({
      ...req.body,
      images: req.body.existingImages ?? req.body.images,
    });
    const validationError = validateRestaurant(payload);
    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }
    await addRestaurantUploads(req, payload);
    if (!payload.images.length) {
      res.status(400).json({ success: false, message: "Please upload at least one restaurant image" });
      return;
    }
    Object.assign(restaurant, payload);
    await restaurant.save();
    await restaurant.populate("owner", safeOwnerFields);
    res.status(200).json({ success: true, message: "Restaurant erfolgreich aktualisiert", restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update restaurant", error: (error as Error).message });
  }
};

export const getManagedRestaurants = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const filter: Record<string, any> = {};
    if (req.user?.role === "restaurant_owner") filter.owner = req.user.id;
    if (req.query.approvalStatus && approvalStatuses.includes(req.query.approvalStatus as any)) {
      filter.approvalStatus = req.query.approvalStatus;
    }
    if (req.query.title) filter.title = { $regex: clean(req.query.title), $options: "i" };
    const [totalItems, restaurants] = await Promise.all([
      Deal.countDocuments(filter),
      Deal.find(filter)
        .populate("category")
        .populate("owner", safeOwnerFields)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    const restaurantsWithMetrics = await Promise.all(restaurants.map(withRestaurantMetrics));
    res.status(200).json({
      success: true,
      restaurants: restaurantsWithMetrics,
      pagination: { currentPage: page, totalPages: Math.ceil(totalItems / limit), totalItems, itemsPerPage: limit },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load restaurants", error: (error as Error).message });
  }
};

export const getManagedRestaurant = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant = await Deal.findById(req.params.id).populate("category").populate("owner", safeOwnerFields);
    if (!restaurant || !canManage(req, restaurant)) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    res.status(200).json({ success: true, restaurant: await withRestaurantMetrics(restaurant) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load restaurant", error: (error as Error).message });
  }
};

export const updateRestaurantApproval = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.body.status;
    if (!approvalStatuses.includes(status) || status === "pending") {
      res.status(400).json({ success: false, message: "Status must be approved or rejected" });
      return;
    }
    const update: Record<string, any> = {
      approvalStatus: status,
      status: status === "approved" ? "activate" : "deactivate",
      rejectionReason: status === "rejected" ? clean(req.body.rejectionReason) : undefined,
      approvedAt: status === "approved" ? new Date() : undefined,
      approvedBy: status === "approved" ? req.user?.id : undefined,
    };
    if (status === "rejected" && !update.rejectionReason) {
      res.status(400).json({ success: false, message: "Please provide a rejection reason" });
      return;
    }
    const restaurant = await Deal.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate("category")
      .populate("owner", safeOwnerFields);
    if (!restaurant) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    res.status(200).json({ success: true, message: `Restaurant ${status}`, restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update restaurant approval", error: (error as Error).message });
  }
};

export const createDish = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant: any = await Deal.findById(req.params.id);
    if (!restaurant || !canManage(req, restaurant)) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    if (req.user?.role !== "admin" && restaurant.approvalStatus !== "approved") {
      res.status(403).json({ success: false, message: "Dishes can be added after the restaurant is approved" });
      return;
    }
    const name = clean(req.body.name);
    const price = numberValue(req.body.price);
    if (!name || price === undefined || price < 0) {
      res.status(400).json({ success: false, message: "Dish name and a valid price are required" });
      return;
    }
    const image = req.file
      ? await uploadImage(req.file as Express.Multer.File)
      : clean(req.body.existingImage ?? req.body.image);
    if (!image) {
      res.status(400).json({ success: false, message: "Please upload a dish image" });
      return;
    }
    restaurant.dishes.push({
      name,
      price,
      description: clean(req.body.description),
      image,
      category: clean(req.body.category),
      isSignatureDish: booleanValue(req.body.isSignatureDish),
      isActive: booleanValue(req.body.isActive, true),
    });
    await restaurant.save();
    res.status(201).json({ success: true, message: "Dish added", restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add dish", error: (error as Error).message });
  }
};

export const updateDish = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant: any = await Deal.findById(req.params.id);
    if (!restaurant || !canManage(req, restaurant)) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    if (req.user?.role !== "admin" && restaurant.approvalStatus !== "approved") {
      res.status(403).json({ success: false, message: "Dishes can be changed after the restaurant is approved" });
      return;
    }
    const dish = restaurant.dishes.id(req.params.dishId);
    if (!dish) {
      res.status(404).json({ success: false, message: "Dish not found" });
      return;
    }
    for (const field of ["name", "description", "category"] as const) {
      if (req.body[field] !== undefined) dish[field] = clean(req.body[field]);
    }
    if (req.file) {
      dish.image = await uploadImage(req.file as Express.Multer.File);
    } else if (req.body.existingImage !== undefined || req.body.image !== undefined) {
      dish.image = clean(req.body.existingImage ?? req.body.image);
    }
    if (!dish.image) {
      res.status(400).json({ success: false, message: "Please upload a dish image" });
      return;
    }
    if (req.body.price !== undefined) dish.price = numberValue(req.body.price);
    if (req.body.isSignatureDish !== undefined) dish.isSignatureDish = booleanValue(req.body.isSignatureDish);
    if (req.body.isActive !== undefined) dish.isActive = booleanValue(req.body.isActive);
    await restaurant.save();
    res.status(200).json({ success: true, message: "Dish updated", restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update dish", error: (error as Error).message });
  }
};

export const deleteDish = async (req: Request, res: Response): Promise<void> => {
  try {
    const restaurant: any = await Deal.findById(req.params.id);
    if (!restaurant || !canManage(req, restaurant)) {
      res.status(404).json({ success: false, message: "Restaurant not found" });
      return;
    }
    if (req.user?.role !== "admin" && restaurant.approvalStatus !== "approved") {
      res.status(403).json({ success: false, message: "Dishes can be changed after the restaurant is approved" });
      return;
    }
    const dish = restaurant.dishes.id(req.params.dishId);
    if (!dish) {
      res.status(404).json({ success: false, message: "Dish not found" });
      return;
    }
    dish.deleteOne();
    await restaurant.save();
    res.status(200).json({ success: true, message: "Dish deleted", restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete dish", error: (error as Error).message });
  }
};
