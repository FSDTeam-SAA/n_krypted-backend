"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Newsletter_controller_1 = require("../controllers/Newsletter.controller");
const router = express_1.default.Router();
// Subscribe to newsletter
router.post('/newsletter/subscribe', Newsletter_controller_1.subscribe);
// Unsubscribe from newsletter
router.post('/newsletter/unsubscribe', Newsletter_controller_1.unsubscribe);
// List all subscribers (admin only)
router.get('/newsletter/subscribers', Newsletter_controller_1.listSubscribers);
// Send newsletter to all subscribers
router.post('/newsletter/send', Newsletter_controller_1.sendNewsletter);
exports.default = router;
