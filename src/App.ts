import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import storyRoutes from "./Routes/storyRoutes";
import authRoutes from "./Routes/authRoute";
import ideasRoutes from './Routes/ideas';
import summariesRoutes from './Routes/summaries';
import globalErrorHandler from "./errors/errorController";
import { config } from "dotenv";

config({ path: "./config.env" });

const { ORIGIN_URL } = process.env;

if (!ORIGIN_URL) {
  throw new Error("Make sure that the origin url and the port is defined");
}
const app = express();

// CORS configuration
const corsOptions = {
  origin: [ORIGIN_URL, 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'],
  credentials: true,
  methods: "GET,POST,DELETE,PATCH",
  allowedHeaders: "Content-Type, Authorization, api_key",
};  

app.use(cors(corsOptions));
//app.all("/:any(*)", cors(corsOptions));
app.use(cookieParser());

app.use(express.json());
app.use(cookieParser());

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'StoriGen API Documentation'
}));

app.use("/api/story", storyRoutes);
app.use('/api/summaries', summariesRoutes);
app.use("/api/v1/auth", authRoutes);
app.use('/api/ideas', ideasRoutes);


// Root route
app.get('/', (req, res) => {
  res.json({ message: "StoriGen API is running!" });
});


// Global error handler
app.use(globalErrorHandler);
 
export default app;
