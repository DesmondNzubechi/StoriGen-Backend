import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import storyRoutes from "./Routes/storyRoutes";
import authRoutes from "./Routes/authRoute";
import globalErrorHandler from "./errors/errorController";

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'StoriGen API Documentation'
}));

app.use("/api/story", storyRoutes);
app.use("/api/v1/auth", authRoutes);

// Global error handler
app.use(globalErrorHandler);
 
export default app;
