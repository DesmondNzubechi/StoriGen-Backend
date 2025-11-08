import { Schema, model, Document, Types } from "mongoose";

export interface IMotivation extends Document {
  _id: Types.ObjectId;
  content: string;
  caption?: string;
  hashtags: string[];
  audioUrl?: string;
  audioTaskId?: string;
  tone?: string;
  theme: string[];
  type?: string;
  targetLength?: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const motivationSchema = new Schema<IMotivation>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    tone: {
      type: String,
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
    },
    // hashtags: {
    //   type: [
    //     {
    //       type: String,
    //       trim: true,
    //     },
    //   ],
    //   default: [],
    // },
    audioUrl: {
      type: String,
      trim: true,
    },
    audioTaskId: {
      type: String,
      trim: true,
    },
    theme: [
      {
        type: String,
        trim: true,
      },
    ],
    type: {
      type: String,
      trim: true,
    },
    targetLength: {
      type: Number,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

motivationSchema.index({ createdAt: -1 });
motivationSchema.index({ tone: 1, type: 1 });
motivationSchema.index({ theme: 1 });
motivationSchema.index({ caption: "text", content: "text" });

export const Motivation = model<IMotivation>("Motivation", motivationSchema);

