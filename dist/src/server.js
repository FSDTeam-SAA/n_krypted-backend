"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const http_1 = __importDefault(require("http"));
const socket_1 = require("./socket/socket");
const deactivateExpiredDeals_1 = require("./cron/deactivateExpiredDeals");
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.IO
const io = (0, socket_1.initializeSocket)(server);
exports.io = io;
const PORT = process.env.PORT || 5000;
(0, db_1.connectDB)().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        (0, deactivateExpiredDeals_1.deactivateExpiredDeals)();
    });
});
