import express from "express";
import cors from "cors";
import storyRoutes from "./Routes/storyRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/story", storyRoutes);
 
export default app;
