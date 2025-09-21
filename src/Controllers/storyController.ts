import { Request, Response } from "express";
import { generateScript } from "../Services/aiService";

export const generateStory = async (req: Request, res: Response) => {
  try {
    const { topic, tone, length } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const script = await generateScript(topic, tone || "Neutral", length || "5 minutes");

    res.json({
      title: `Story about ${topic}`,
      script,
    });
  } catch (err: any) {
    console.error("❌ Error generating story:", err.message);
    res.status(500).json({ error: "Failed to generate story" });
  }
};
