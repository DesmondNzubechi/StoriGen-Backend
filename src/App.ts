import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "./config/passport";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import storyRoutes from "./Routes/storyRoutes";
import authRoutes from "./Routes/authRoute";
import ideasRoutes from "./Routes/ideas";
import shortsRoutes from "./Routes/shortsRoute";
import summariesRoutes from "./Routes/summaries";
import motivationRoutes from "./Routes/motivationRoutes";
import globalErrorHandler from "./errors/errorController";
import { config } from "dotenv";

config({ path: "./config.env" });

const {
  ORIGIN_URL,
  CORS_ADDITIONAL_ORIGINS,
  NODE_ENV,
  SESSION_SECRET,
} = process.env;

if (!ORIGIN_URL) {
  throw new Error("Make sure that the ORIGIN_URL environment variable is defined");
}

const app = express();

app.set("trust proxy", 1);
  
const defaultOrigins = [
  ORIGIN_URL,
  "http://localhost:3000",
  "https://storigen.site",
  "https://storigen.vercel.app",
];

const extraOrigins = (CORS_ADDITIONAL_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const allowedOrigins = new Set([...defaultOrigins, ...extraOrigins]);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "api_key"],
};

app.use(cors(corsOptions));

app.use((req: Request, res: Response, next: NextFunction) => {
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

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Configure express-session
const isProduction = NODE_ENV === "production";
app.use(
  session({
    secret: SESSION_SECRET || "your-session-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? "none" : "lax",
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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
app.use('/api/shorts', shortsRoutes);
app.use("/api/v1/motivation", motivationRoutes);


// Root route
app.get('/', (req, res) => {
  res.json({ message: "StoriGen API is running!" });
});


// Global error handler
app.use(globalErrorHandler);
 
export default app;
