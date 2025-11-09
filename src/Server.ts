import app from "./App";
import mongoose from "mongoose";
import { config } from "dotenv";

config({ path: "./config.env" });

const { DATABASE_URL, PORT = "5000", NODE_ENV, VERCEL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

mongoose.set("strictQuery", false);

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithCache = globalThis as typeof globalThis & {
  __mongooseConnection?: CachedConnection;
};

if (!globalWithCache.__mongooseConnection) {
  globalWithCache.__mongooseConnection = { conn: null, promise: null };
}

const cachedConnection = globalWithCache.__mongooseConnection;

const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (cachedConnection.conn) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    cachedConnection.promise = mongoose.connect(DATABASE_URL).then((mongooseInstance) => {
      console.log("MongoDB connection established");
      return mongooseInstance;
    });
  }

  cachedConnection.conn = await cachedConnection.promise;
  return cachedConnection.conn;
};

const serverlessHandler = async (req: any, res: any) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    console.error("Failed to handle request", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

if (!VERCEL && NODE_ENV !== "production") {
  connectToDatabase()
    .then(() => {
      app.listen(parseInt(PORT, 10), () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start local server", error);
    });
}

export default serverlessHandler;