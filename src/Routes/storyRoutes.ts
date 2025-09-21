import { Router } from "express";
import { generateStory } from "../Controllers/storyController";

const router = Router();

router.post("/generate", generateStory);

export default router;
