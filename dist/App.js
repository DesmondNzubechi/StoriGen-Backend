"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const storyRoutes_1 = __importDefault(require("./Routes/storyRoutes"));
const authRoute_1 = __importDefault(require("./Routes/authRoute"));
const ideas_1 = __importDefault(require("./Routes/ideas"));
const shortsRoute_1 = __importDefault(require("./Routes/shortsRoute"));
const summaries_1 = __importDefault(require("./Routes/summaries"));
const motivationRoutes_1 = __importDefault(require("./Routes/motivationRoutes"));
const errorController_1 = __importDefault(require("./errors/errorController"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: "./config.env" });
const { ORIGIN_URL, CORS_ADDITIONAL_ORIGINS, NODE_ENV, } = process.env;
if (!ORIGIN_URL) {
    throw new Error("Make sure that the ORIGIN_URL environment variable is defined");
}
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const defaultOrigins = [
    ORIGIN_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8080",
    "https://storigen.vercel.app",
    "https://v0-ai-story-tool.vercel.app"
];
const extraOrigins = (CORS_ADDITIONAL_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
const allowedOrigins = new Set([...defaultOrigins, ...extraOrigins]);
const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error(`Origin ${origin} is not allowed by CORS`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "api_key"],
};
app.use((0, cors_1.default)(corsOptions));
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, api_key");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});
app.use(express_1.default.json({ limit: "1mb" }));
app.use((0, cookie_parser_1.default)());
// Swagger UI setup
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'StoriGen API Documentation'
}));
app.use("/api/story", storyRoutes_1.default);
app.use('/api/summaries', summaries_1.default);
app.use("/api/v1/auth", authRoute_1.default);
app.use('/api/ideas', ideas_1.default);
app.use('/api/shorts', shortsRoute_1.default);
app.use("/api/v1/motivation", motivationRoutes_1.default);
// Root route
app.get('/', (req, res) => {
    res.json({ message: "StoriGen API is running!" });
});
// Global error handler
app.use(errorController_1.default);
exports.default = app;
