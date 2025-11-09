"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const App_1 = __importDefault(require("./App"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: "./config.env" });
const { DATABASE_URL, PORT = "5000", NODE_ENV, VERCEL } = process.env;
if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
}
mongoose_1.default.set("strictQuery", false);
const globalWithCache = globalThis;
if (!globalWithCache.__mongooseConnection) {
    globalWithCache.__mongooseConnection = { conn: null, promise: null };
}
const cachedConnection = globalWithCache.__mongooseConnection;
const connectToDatabase = async () => {
    if (cachedConnection.conn) {
        return cachedConnection.conn;
    }
    if (!cachedConnection.promise) {
        cachedConnection.promise = mongoose_1.default.connect(DATABASE_URL).then((mongooseInstance) => {
            console.log("MongoDB connection established");
            return mongooseInstance;
        });
    }
    cachedConnection.conn = await cachedConnection.promise;
    return cachedConnection.conn;
};
const serverlessHandler = async (req, res) => {
    try {
        await connectToDatabase();
        return (0, App_1.default)(req, res);
    }
    catch (error) {
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
        App_1.default.listen(parseInt(PORT, 10), () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
        .catch((error) => {
        console.error("Failed to start local server", error);
    });
}
exports.default = serverlessHandler;
