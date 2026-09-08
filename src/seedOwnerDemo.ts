import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

import CheckIn from "./models/CheckIn.model";
import Deal from "./models/Deal.model";
import Review from "./models/Review.model";
import User from "./models/User.model";

dotenv.config();

const targetRestaurantTitle = process.argv.slice(2).join(" ").trim() || "Sozib23";

const demoDishes = [
  {
    name: "Schnitzel",
    description:
      "Goldbraun paniertes Schnitzel mit knusprigen Pommes frites und frischer Zitrone.",
    price: 18.9,
    image:
      "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=1000&auto=format&fit=crop&q=85",
    images: [
      "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=1000&auto=format&fit=crop&q=85",
    ],
    category: "Hauptspeise",
    specialtyDescription: "Hausklassiker nach traditionellem Rezept",
    ingredients: ["Kalbfleisch", "Paniermehl", "Pommes frites", "Zitrone"],
    preparationProcess:
      "Frisch paniert und in Butterschmalz goldbraun ausgebacken.",
    isSignatureDish: true,
    isActive: true,
  },
  {
    name: "Gebratenes Steak",
    description:
      "Saftig gebratenes Rindersteak mit Kräuterbutter, Tomaten und frischen Kräutern.",
    price: 26.5,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=85",
    images: [
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=1000&auto=format&fit=crop&q=85",
    ],
    category: "Steak",
    specialtyDescription: "Premium Cut mit hausgemachter Kräuterbutter",
    ingredients: ["Rindfleisch", "Kräuterbutter", "Tomaten", "Meersalz"],
    preparationProcess:
      "Scharf angebraten, schonend fertig gegart und vor dem Servieren ruhen gelassen.",
    isSignatureDish: true,
    isActive: true,
  },
];

const demoVisits = [
  {
    name: "Nita Money",
    email: "nita.money.demo@example.com",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80",
    daysAgo: 2,
    partySize: 2,
    distanceMeters: 18,
    rating: 4,
    comment:
      "Die goldbraune Kruste war leicht und knusprig, das Fleisch saftig und geschmackvoll. Sehr empfehlenswert.",
  },
  {
    name: "Lukas Weber",
    email: "lukas.weber.demo@example.com",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80",
    daysAgo: 5,
    partySize: 3,
    distanceMeters: 24,
    rating: 5,
    comment:
      "Das Steak war perfekt gegart, wunderbar saftig und die Kräuterbutter passte hervorragend dazu.",
  },
];

async function seedOwnerDemo() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not configured");

  await mongoose.connect(mongoUri);

  try {
    const restaurant = await Deal.findOne({ title: targetRestaurantTitle });
    if (!restaurant) {
      throw new Error(`Restaurant not found: ${targetRestaurantTitle}`);
    }

    const previousDishes = restaurant.dishes ?? [];
    const firstImage = previousDishes[0]?.image?.trim();
    const dishes = demoDishes.map((dish, index) => ({
      _id: previousDishes[index]?._id ?? new mongoose.Types.ObjectId(),
      ...dish,
      image: index === 0 && firstImage ? firstImage : dish.image,
      images:
        index === 0 && firstImage
          ? [firstImage, ...dish.images.filter((image) => image !== firstImage)]
          : dish.images,
    }));

    restaurant.dishes = dishes;
    await restaurant.save();

    const password = await bcrypt.hash("Demo123!", 10);
    for (let index = 0; index < demoVisits.length; index += 1) {
      const demo = demoVisits[index];
      const checkedInAt = new Date(
        Date.now() - demo.daysAgo * 24 * 60 * 60 * 1000
      );
      const user = await User.findOneAndUpdate(
        { email: demo.email },
        {
          name: demo.name,
          email: demo.email,
          avatar: demo.avatar,
          password,
          role: "user",
          isVerified: true,
          country: "Deutschland",
          cityState: "München",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const checkIn = await CheckIn.findOneAndUpdate(
        { userId: user._id, restaurantId: restaurant._id },
        {
          userId: user._id,
          restaurantId: restaurant._id,
          checkedInAt,
          partySize: demo.partySize,
          userLocation: {
            latitude: 48.1351,
            longitude: 11.582,
            accuracy: 8,
          },
          distanceMeters: demo.distanceMeters,
          status: "verified",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      const dish = dishes[index];

      await Review.findOneAndUpdate(
        { checkInID: checkIn._id },
        {
          userID: user._id,
          dealID: restaurant._id,
          checkInID: checkIn._id,
          dishID: dish._id,
          dishName: dish.name,
          ratings: demo.rating,
          reviewComment: demo.comment,
          createdAt: checkedInAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log(`Seeded demo owner dashboard for ${restaurant.title}`);
    console.log("Dishes: Schnitzel, Gebratenes Steak");
    console.log("Verified check-ins: 2; dish reviews: 2; average rating: 4.5");
  } finally {
    await mongoose.disconnect();
  }
}

seedOwnerDemo().catch((error: unknown) => {
  console.error("Owner demo seed failed:", (error as Error).message);
  process.exitCode = 1;
});
