import { Schema, model, Document, Types } from "mongoose";

export interface ISummary extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  niche: string;
  content: string;
  mainCharacters: string[];
  conflict: string;
  resolution: string;
  moralLesson: string;
  themes: string[];
  createdAt: Date;
  updatedAt: Date;
}
 
const summarySchema = new Schema<ISummary>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    niche: { type: String, required: true },
    mainCharacters: [{ type: String, trim: true }],
    conflict: { type: String, required: true },
    resolution: { type: String, required: true },
    moralLesson: { type: String, required: true },
    themes: [{ type: String, trim: true }],
  },
  { timestamps: true }
);
 
// Indexes for efficient querying
summarySchema.index({ user: 1, createdAt: -1 });
summarySchema.index({ niche: 1 });
summarySchema.index({ themes: 1 });

export const Summary = model<ISummary>("Summary", summarySchema);
