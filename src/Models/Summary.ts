import { Schema, model, Document, Types } from "mongoose";

export interface ISummary extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  idea: string;
  title: string;
  niche: string;
  content: string;
  hook: string;
  conflict: string;
  resolution: string;
  culturalElements: string[];
  viralElements: string[];
  createdAt: Date;
  updatedAt: Date;
}
 
const summarySchema = new Schema<ISummary>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    idea: { type: String,  required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    niche: { type: String, required: true },
    hook: { type: String, required: true },
    conflict: { type: String, required: true },
    resolution: { type: String, required: true },
    culturalElements: [{ type: String, trim: true }],
    viralElements: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// Indexes for efficient querying
summarySchema.index({ user: 1, createdAt: -1 });
summarySchema.index({ idea: 1 });

export const Summary = model<ISummary>("Summary", summarySchema);
