import { Schema, model, Document } from "mongoose";

export interface IStory extends Document {
  prompt: string;
  targetWords: number;
  targetChapters: number;
  content: string; // full story text
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    prompt: { type: String, required: true },
    targetWords: { type: Number, required: true },
    targetChapters: { type: Number, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default model<IStory>("Story", storySchema);
