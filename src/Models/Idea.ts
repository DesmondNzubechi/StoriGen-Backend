import { Schema, model, Document, Types } from "mongoose";

export interface IIdea extends Document {
  favorite: boolean;
  _id: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  content: string;
  niche: string;
  theme: string;
  setting: string;
  characters: string[];
  tone: 'dramatic' | 'mysterious' | 'emotional' | 'cinematic' | 'traditional';
  style: 'viral' | 'educational' | 'entertainment' | 'cultural';
  targetAudience: 'children' | 'adults' | 'family' | 'teens';
  createdAt: Date;
  updatedAt: Date;
} 
   
const ideaSchema = new Schema<IIdea>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, 
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true }, 
    niche : {type: String, required: true},
    theme: { type: String, required: true, trim: true },
    setting: { type: String, required: true, trim: true },
    favorite: {type : Boolean, default: false},
    characters: [{ type: String, trim: true }],
    tone: {
      type: String,
      enum: ['dramatic', 'mysterious', 'emotional', 'cinematic', 'traditional'],
      default: 'dramatic'
    },
    style: {
      type: String,
      enum: ['viral', 'educational', 'entertainment', 'cultural'],
      default: 'viral'
    },
    targetAudience: {
      type: String,
      enum: ['children', 'adults', 'family', 'teens'],
      default: 'adults'
    }, 
  },
  { timestamps: true }
);

// Indexes for efficient querying
ideaSchema.index({ user: 1, createdAt: -1 });
ideaSchema.index({ theme: 1 });
ideaSchema.index({ tone: 1, style: 1 });

export const Idea = model<IIdea>("Idea", ideaSchema);
