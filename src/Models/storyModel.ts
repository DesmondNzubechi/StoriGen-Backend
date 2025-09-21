import mongoose, { Schema, Document } from "mongoose";

export interface IStory extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  summary: string;
  content: string;
  createdAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IStory>("Story", storySchema);
