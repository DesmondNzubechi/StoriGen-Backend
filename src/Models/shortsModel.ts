import mongoose, { Schema, Types, Document } from "mongoose";

export interface ShortsType extends Document {
  content: string;
  title: string;
  caption: string;
  hashTag: string;
  imagePrompts: string[];
  theme: string;
  typeOfMotivation: string;
  user: Types.ObjectId;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
  summary?: string;
}
 
const shortsSchema = new Schema<ShortsType>(
  {
    content: {
      type: String,
      required: [true, "Kindly provide the content of this motivational script."],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Kindly provide the title of this script."],
      trim: true,
    },
    caption: {
      type: String,
      required: [true, "A caption is required for this motivational short."],
      trim: true,
    },
    hashTag: {
      type: String,
      required: [true, "Please include at least one hashtag."],
      trim: true,
    },
    imagePrompts: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => Array.isArray(arr),
        message: "Image prompts must be an array of strings.",
      },
    },
    theme: {
      type: String,
      required: [true, "Please specify the theme (e.g., discipline, consistency, mindset)."],
      trim: true,
    },
    typeOfMotivation: {
      type: String,
      required: [true, "Please specify the type of motivation (e.g., fitness, personal, career)."],
      enum: [
        "Personal Motivation",
        "Career Motivation",
        "Fitness Motivation",
        "Financial Motivation",
        "Academic Motivation",
        "Spiritual Motivation",
      ],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A user must be associated with this short."],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔹 Pre-save hook: create a URL-friendly slug from title
shortsSchema.pre<ShortsType>("save", function (next) {
  if (this.isModified("title")) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

// 🔹 Virtual field for short summary
shortsSchema.virtual("summary").get(function (this: ShortsType) {
  return this.content.length > 100 ? this.content.slice(0, 100) + "..." : this.content;
});

// 🔹 Text index for efficient searching
shortsSchema.index({
  title: "text",
  caption: "text",
  content: "text",
  theme: "text",
  typeOfMotivation: "text",
});

const ShortsModel = mongoose.model<ShortsType>("Shorts", shortsSchema);

export default ShortsModel;
