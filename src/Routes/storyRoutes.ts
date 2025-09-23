import express from "express";
import { generateStoryStream, getStories, getStoryById } from "../Controllers/storyController";

const router = express.Router();

// Stream & save a story
router.post("/generate/stream", generateStoryStream);

// Get all stories
router.get("/", getStories);

// Get one story by ID
router.get("/:id", getStoryById);

export default router;
