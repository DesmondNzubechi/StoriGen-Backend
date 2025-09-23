"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storyController_1 = require("../Controllers/storyController");
const router = express_1.default.Router();
// Stream & save a story
router.post("/generate/stream", storyController_1.generateStoryStream);
// Get all stories
router.get("/", storyController_1.getStories);
// Get one story by ID
router.get("/:id", storyController_1.getStoryById);
exports.default = router;
