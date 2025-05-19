"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const newsletter_routes_1 = __importDefault(require("./routes/newsletter.routes"));
const review_routes_1 = __importDefault(require("./routes/review.routes"));
const blog_routes_1 = __importDefault(require("./routes/blog.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const deal_routes_1 = __importDefault(require("./routes/deal.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const error_middleware_1 = __importDefault(require("./middlewares/error.middleware"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const feedback_routes_1 = __importDefault(require("./routes/feedback.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const authtest_1 = __importDefault(require("./routes/authtest"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// JSON parsing and validation middleware
app.use(body_parser_1.default.json({
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf.toString());
        }
        catch (e) {
            res.status(400).json({
                success: false,
                error: 'Invalid JSON payload',
                details: e?.message || 'Unknown error',
            });
            throw e;
        }
    },
}));
app.use('/api/auth', auth_routes_1.default);
app.use('/api', newsletter_routes_1.default);
app.use('/api', review_routes_1.default);
app.use('/api', blog_routes_1.default);
app.use('/api', category_routes_1.default);
app.use('/api', deal_routes_1.default);
app.use('/api', booking_routes_1.default);
app.use('/api', payment_routes_1.default);
app.use('/api', feedback_routes_1.default);
app.use('/api', notification_routes_1.default);
app.use('/api', authtest_1.default);
app.use(error_middleware_1.default);
exports.default = app;
