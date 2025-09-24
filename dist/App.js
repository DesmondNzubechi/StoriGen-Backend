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
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
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
// Global error handler
app.use(errorController_1.default);
exports.default = app;
