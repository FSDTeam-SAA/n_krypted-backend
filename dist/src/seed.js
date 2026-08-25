"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_model_1 = __importDefault(require("./models/User.model"));
const Category_model_1 = __importDefault(require("./models/Category.model"));
const Deal_model_1 = __importDefault(require("./models/Deal.model"));
const Review_model_1 = __importDefault(require("./models/Review.model"));
const Booking_model_1 = __importDefault(require("./models/Booking.model"));
const PaymentInfo_model_1 = require("./models/PaymentInfo.model");
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://saafsdapp_db_user:l5RUXXYwIB5GzKpY@nkrypted.xsva9zu.mongodb.net/?appName=nkrypted";
async function seed() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose_1.default.connect(MONGODB_URI);
        console.log("Connected to MongoDB successfully!");
        // 1. Admin User
        const hashedPassword = await bcrypt_1.default.hash("123456", 10);
        const adminUser = await User_model_1.default.findOneAndUpdate({ email: "admin@gmail.com" }, {
            name: "N Verschlüsselt",
            email: "admin@gmail.com",
            password: hashedPassword,
            phoneNumber: "+49 151 23456789",
            role: "admin",
            isVerified: true,
            country: "Deutschland",
            cityState: "München",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        }, { upsert: true, new: true });
        console.log("Admin user created/updated:", adminUser.email);
        // 2. Regular Users
        const usersData = [
            { name: "Guy Hawkins", email: "guy.hawkins@gmail.com", phoneNumber: "+49 151 23456789", cityState: "München, Deutschland" },
            { name: "Jenny Wilson", email: "jenny.wilson@gmail.com", phoneNumber: "+49 151 23456789", cityState: "München, Deutschland" },
            { name: "Niti Kapoor", email: "niti.kapoor@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Berlin, Deutschland" },
            { name: "Robert Fox", email: "robert.fox@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Hamburg, Deutschland" },
            { name: "Cody Fisher", email: "cody.fisher@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Frankfurt, Deutschland" },
            { name: "Esther Howard", email: "esther.howard@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Köln, Deutschland" },
            { name: "Kristin Watson", email: "kristin.watson@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Stuttgart, Deutschland" },
            { name: "Cameron Williamson", email: "cameron.w@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Düsseldorf, Deutschland" },
            { name: "Jane Cooper", email: "jane.cooper@gmail.com", phoneNumber: "+49 151 23456789", cityState: "München, Deutschland" },
            { name: "Wade Warren", email: "wade.warren@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Leipzig, Deutschland" },
            { name: "Devon Lane", email: "devon.lane@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Dortmund, Deutschland" },
            { name: "Kathryn Murphy", email: "kathryn.m@gmail.com", phoneNumber: "+49 151 23456789", cityState: "Essen, Deutschland" },
        ];
        const createdUsers = [];
        for (const u of usersData) {
            const user = await User_model_1.default.findOneAndUpdate({ email: u.email }, {
                name: u.name,
                email: u.email,
                password: hashedPassword,
                phoneNumber: u.phoneNumber,
                role: "user",
                isVerified: true,
                country: "Deutschland",
                cityState: u.cityState,
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            }, { upsert: true, new: true });
            createdUsers.push(user);
        }
        console.log(`Created/Updated ${createdUsers.length} users.`);
        // 3. Categories
        const categoriesData = [
            { categoryName: "Schnitzel", image: "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=400&auto=format&fit=crop&q=80" },
            { categoryName: "Steak", image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80" },
            { categoryName: "Traditionell", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop&q=80" },
            { categoryName: "Gourmet", image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80" },
            { categoryName: "Desserts", image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&auto=format&fit=crop&q=80" },
        ];
        const createdCategories = [];
        for (const c of categoriesData) {
            const cat = await Category_model_1.default.findOneAndUpdate({ categoryName: c.categoryName }, { categoryName: c.categoryName, image: c.image }, { upsert: true, new: true });
            createdCategories.push(cat);
        }
        console.log(`Created/Updated ${createdCategories.length} categories.`);
        // 4. Deals / Restaurants
        const dealsData = [
            {
                title: "Mabees Küche - Original Wiener Schnitzel",
                shortDescription: "Traditionelles Wiener Schnitzel mit knusprigen Pommes frites und frischem Beilagensalat.",
                description: "Dieses Schnitzel ist seit der Gründung des Restaurants eine beliebte Spezialität und gehört nach wie vor zu den am häufigsten bestellten Gerichten unserer Stammgäste. Seine Beliebtheit verdankt es einer sorgfältig verfeinerten Zubereitungsmethode.",
                price: 15.45,
                location: { country: "Deutschland", city: "München" },
                images: [
                    "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=600&auto=format&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
                ],
                offers: ["Kostenloses Dessert bei Vorbestellung", "Inklusive 1 Softdrink"],
                category: createdCategories[0]._id,
                status: "activate",
                time: 45,
                participationsLimit: 50,
            },
            {
                title: "Restaurant JAN - Saftiges Rumpsteak",
                shortDescription: "Gegrilltes Premium-Rumpsteak mit Kräuterbutter und Rosmarinkartoffeln.",
                description: "Saftig gegrilltes Rumpsteak mit feiner hausgemachter Kräuterbutter, Rosmarinkartoffeln und knackigem Grillgemüse. Ein Fest für jeden Fleischliebhaber.",
                price: 24.50,
                location: { country: "Deutschland", city: "München" },
                images: [
                    "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
                ],
                offers: ["Glas Wein inklusive"],
                category: createdCategories[1]._id,
                status: "activate",
                time: 60,
                participationsLimit: 30,
            },
            {
                title: "Alpenblick Restaurant - Frische Rouladen",
                shortDescription: "Klassische Rinderroulade nach Großmutters Geheimrezept.",
                description: "Traditionelle Rinderroulade gefüllt mit Speck, Zwiebeln und Gewürzgurke, serviert mit feinem Apfelrotkohl und hausgemachten Kartoffelklößen.",
                price: 18.50,
                location: { country: "Deutschland", city: "Berlin" },
                images: [
                    "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
                ],
                offers: ["Familienangebot: 10% Rabatt ab 4 Personen"],
                category: createdCategories[2]._id,
                status: "activate",
                time: 50,
                participationsLimit: 40,
            },
            {
                title: "Curry Queen - Berliner Currywurst Special",
                shortDescription: "Exklusive Currywurst mit hausgemachter pikanter Currysauce und Steakhouse-Pommes.",
                description: "Die beste Currywurst der Stadt, verfeinert mit einer geheimen Gewürzmischung aus 12 Kräutern.",
                price: 9.90,
                location: { country: "Deutschland", city: "Hamburg" },
                images: [
                    "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=600&auto=format&fit=crop&q=80",
                ],
                offers: ["Extra Portion Pommes gratis"],
                category: createdCategories[2]._id,
                status: "activate",
                time: 20,
                participationsLimit: 100,
            },
            {
                title: "Bella Vista - Trüffel Pasta Gourmet",
                shortDescription: "Handgemachte Tagliolini mit frischem schwarzem Trüffel und Parmesan-Emulsion.",
                description: "Exquisite Pasta mit feinstem schwarzen Trüffel direkt aus dem Piemont, in leichter Butter-Salbei-Sauce.",
                price: 22.00,
                location: { country: "Deutschland", city: "Frankfurt" },
                images: [
                    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
                ],
                offers: ["Aperitif inklusive"],
                category: createdCategories[3]._id,
                status: "activate",
                time: 40,
                participationsLimit: 25,
            },
            {
                title: "Sonnengarten - Zartes Hähnchenbrustfilet",
                shortDescription: "Gegrillte Maispoulardenbrust auf buntem mediterranem Grillgemüse.",
                description: "Zarte Hähnchenbrust marinierte Kräutern und Olivenöl, schonend gegart und auf den Punkt serviert.",
                price: 16.80,
                location: { country: "Deutschland", city: "Köln" },
                images: [
                    "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
                ],
                offers: ["Dessert zum halben Preis"],
                category: createdCategories[0]._id,
                status: "deactivate",
                time: 35,
                participationsLimit: 30,
            },
        ];
        const createdDeals = [];
        for (const d of dealsData) {
            const deal = await Deal_model_1.default.findOneAndUpdate({ title: d.title }, {
                ...d,
                scheduleDates: [
                    { date: new Date(Date.now() + 86400000 * 2), active: true, participationsLimit: 20, bookedCount: 5 },
                    { date: new Date(Date.now() + 86400000 * 5), active: true, participationsLimit: 20, bookedCount: 8 },
                    { date: new Date(Date.now() + 86400000 * 10), active: true, participationsLimit: 20, bookedCount: 2 },
                ],
            }, { upsert: true, new: true });
            createdDeals.push(deal);
        }
        console.log(`Created/Updated ${createdDeals.length} deals.`);
        // 5. Reviews
        await Review_model_1.default.deleteMany({});
        const reviewComments = [
            "Hervorragendes Essen, schönes Ambiente und freundlicher Service. Die Gerichte waren frisch, schmackhaft und ansprechend angerichtet. Insgesamt ein wirklich tolles Erlebnis – definitiv einen Besuch wert!",
            "Absolut fantastisches Geschmackserlebnis! Die Zubereitung war perfekt auf den Punkt. Wir kommen sehr gerne wieder.",
            "Sehr zuvorkommendes Personal und köstliche Spezialitäten. Das Ambiente ist modern und gemütlich zugleich.",
            "Ein echtes Highlight in München. Die Qualität der Zutaten hat uns vollkommen überzeugt!",
        ];
        for (let i = 0; i < createdDeals.length; i++) {
            const deal = createdDeals[i];
            const user = createdUsers[i % createdUsers.length];
            await Review_model_1.default.create({
                userID: user._id,
                dealID: deal._id,
                ratings: 4 + (i % 2 === 0 ? 1 : 0),
                reviewComment: reviewComments[i % reviewComments.length],
            });
        }
        console.log("Created real reviews.");
        // 6. Bookings & Payments
        await Booking_model_1.default.deleteMany({});
        await PaymentInfo_model_1.PaymentInfo.deleteMany({});
        for (let i = 0; i < createdDeals.length; i++) {
            const deal = createdDeals[i];
            const user = createdUsers[i % createdUsers.length];
            const booking = await Booking_model_1.default.create({
                userId: user._id,
                bookingId: `BK-${1000 + i}`,
                dealsId: deal._id,
                price: deal.price,
                isBooked: true,
                notifyMe: false,
                scheduleDate: new Date(Date.now() + 86400000 * 3),
                quantity: 2,
                paymentStatus: "complete",
            });
            await PaymentInfo_model_1.PaymentInfo.create({
                userId: user._id,
                dealId: deal._id,
                bookingId: booking._id,
                price: deal.price * 2,
                paymentStatus: "complete",
                paymentMethod: "stripe",
            });
        }
        console.log("Created real bookings and payment records.");
        console.log("\n==========================================");
        console.log("DATABASE SEED COMPLETED SUCCESSFULLY!");
        console.log("Admin login: admin@gmail.com / 123456");
        console.log("==========================================\n");
        process.exit(0);
    }
    catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
}
seed();
