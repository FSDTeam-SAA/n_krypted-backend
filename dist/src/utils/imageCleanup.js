"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownedImagePublicId = ownedImagePublicId;
exports.queueRemovedImages = queueRemovedImages;
exports.imageIsReferenced = imageIsReferenced;
exports.processImageCleanup = processImageCleanup;
exports.startImageCleanupWorker = startImageCleanupWorker;
const cloudinary_1 = __importDefault(require("./cloudinary"));
const ImageCleanup_model_1 = __importDefault(require("../models/ImageCleanup.model"));
const Deal_model_1 = __importDefault(require("../models/Deal.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const Category_model_1 = __importDefault(require("../models/Category.model"));
const Blog_model_1 = __importDefault(require("../models/Blog.model"));
function ownedImagePublicId(value) {
    try {
        const url = new URL(value);
        const cloud = cloudinary_1.default.config().cloud_name;
        if (!cloud || url.hostname !== 'res.cloudinary.com' || !['https:', 'http:'].includes(url.protocol))
            return null;
        const prefix = `/${cloud}/image/upload/`;
        if (!url.pathname.startsWith(prefix))
            return null;
        const path = url.pathname.slice(prefix.length);
        // Uploaded secure_urls have a version; do not guess IDs for arbitrary URLs.
        const match = path.match(/(?:^|\/)v\d+\/(.+)\.[a-zA-Z0-9]+$/);
        return match ? decodeURIComponent(match[1]) : null;
    }
    catch {
        return null;
    }
}
async function queueRemovedImages(before, after) {
    const removed = [...new Set(before)].filter(url => !after.includes(url));
    for (const url of removed) {
        const publicId = ownedImagePublicId(url);
        if (publicId)
            await ImageCleanup_model_1.default.updateOne({ url }, { $setOnInsert: { url, publicId, nextAttemptAt: new Date() } }, { upsert: true });
    }
    return removed;
}
async function imageIsReferenced(publicId) {
    const variants = [...new Set([publicId, publicId.split('/').map(encodeURIComponent).join('/')])];
    const escaped = variants.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const image = new RegExp(`/(?:${escaped})\\.[a-zA-Z0-9]+(?:[?#].*)?$`);
    const references = await Promise.all([
        Deal_model_1.default.exists({ $or: [{ images: image }, { 'dishes.image': image }, { 'dishes.images': image }] }),
        User_model_1.default.exists({ avatar: image }), Category_model_1.default.exists({ image }), Blog_model_1.default.exists({ image }),
    ]);
    return references.some(Boolean);
}
async function processImageCleanup(urls) {
    const jobs = await ImageCleanup_model_1.default.find(urls ? { url: { $in: urls } } : { nextAttemptAt: { $lte: new Date() } }).sort({ nextAttemptAt: 1 }).limit(25);
    for (const job of jobs) {
        try {
            if (ownedImagePublicId(job.url) !== job.publicId)
                continue;
            // Never remove an asset still used by any restaurant/dish/profile/category/blog.
            if (await imageIsReferenced(job.publicId)) {
                await ImageCleanup_model_1.default.updateOne({ _id: job._id }, { $set: { nextAttemptAt: new Date(Date.now() + 3600000) } });
                continue;
            }
            const result = await cloudinary_1.default.uploader.destroy(job.publicId, { resource_type: 'image', invalidate: true });
            if (!['ok', 'not found'].includes(result.result))
                throw new Error('Image deletion not acknowledged');
            await ImageCleanup_model_1.default.deleteOne({ _id: job._id });
        }
        catch {
            await ImageCleanup_model_1.default.updateOne({ _id: job._id }, { $inc: { attempts: 1 }, $set: { nextAttemptAt: new Date(Date.now() + 300000) } });
        }
    }
}
function startImageCleanupWorker() {
    let busy = false;
    const timer = setInterval(async () => {
        if (busy)
            return;
        busy = true;
        try {
            await processImageCleanup();
        }
        catch {
            console.warn('Image cleanup will retry');
        }
        finally {
            busy = false;
        }
    }, 60000);
    timer.unref();
}
