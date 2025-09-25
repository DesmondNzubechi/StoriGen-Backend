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
const errorController_1 = __importDefault(require("./errors/errorController"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: "./config.env" });
const { ORIGIN_URL } = process.env;
if (!ORIGIN_URL) {
    throw new Error("Make sure that the origin url and the port is defined");
}
const app = (0, express_1.default)();
// CORS configuration
const corsOptions = {
    origin: [ORIGIN_URL, 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: "GET,POST,DELETE,PATCH",
    allowedHeaders: "Content-Type, Authorization, api_key",
};
app.use((0, cors_1.default)(corsOptions));
//app.all("/:any(*)", cors(corsOptions));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Swagger UI setup
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'StoriGen API Documentation'
}));
app.use("/api/story", storyRoutes_1.default);
app.use("/api/v1/auth", authRoute_1.default);
// Root route
app.get('/', (req, res) => {
    res.json({ message: "StoriGen API is running!" });
});
// Global error handler
app.use(errorController_1.default);
exports.default = app;
