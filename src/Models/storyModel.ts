// import { Schema, model, Document, Types } from "mongoose";

// interface IParagraph {
//   text: string;
//   imagePrompt?: string;
// }

// interface IChapter {
//   number: number;
//   title?: string;
//   text: string;
//   paragraphs: IParagraph[];
// }

// interface IYouTubeAssets {
//   synopsis?: string;
//   titles?: string[];
//   description?: string;
//   thumbnailPrompt?: string;
//   hashtags?: string[];
// }

// export interface IStory extends Document {
//   user?: Types.ObjectId; // optional if you want authentication
//   prompt: string;
//   targetWords: number;
//   targetChapters: number;
//   outline?: string;
//   characterProfile?: string;
//   chapters: IChapter[];
//   youtubeAssets: IYouTubeAssets;
//   status: "in_progress" | "chapters_complete" | "assets_complete";
//   createdAt: Date;
//   updatedAt: Date;
// }

// const paragraphSchema = new Schema<IParagraph>({
//   text: { type: String, required: true },
//   imagePrompt: { type: String },
// });

// const chapterSchema = new Schema<IChapter>({
//   number: { type: Number, required: true },
//   title: { type: String },
//   text: { type: String, required: true },
//   paragraphs: [paragraphSchema],
// });

// const youtubeAssetsSchema = new Schema<IYouTubeAssets>({
//   synopsis: { type: String },
//   titles: [{ type: String }],
//   description: { type: String },
//   thumbnailPrompt: { type: String },
//   hashtags: [{ type: String }],
// });

// const storySchema = new Schema<IStory>(
//   {
//     user: { type: Schema.Types.ObjectId, ref: "User" },
//     prompt: { type: String, required: true },
//     targetWords: { type: Number, required: true },
//     targetChapters: { type: Number, required: true },
//     outline: { type: String },
//     characterProfile: { type: String },
//     chapters: [chapterSchema],
//     youtubeAssets: { type: youtubeAssetsSchema, default: {} },
//     status: {
//       type: String,
//       enum: ["in_progress", "chapters_complete", "assets_complete"],
//       default: "in_progress",
//     },
//   },
//   { timestamps: true }
// );

// export const Story = model<IStory>("Story", storySchema);

import { Schema, model, Document, Types } from "mongoose";

interface IParagraph {
  text: string;
  imagePrompt?: string;
}

interface IChapter {
  number: number;
  content: string;
  title?: string;
  summary?: string; // Short summary for continuity
  paragraphs: IParagraph[];
  wordCount: number;
}

interface IOutlineItem {
  number: number;
  purpose: string;
  description: string;
}
 
interface IYouTubeAssets {
  synopsis?: string;
  titles?: string[];
  description?: string;
  thumbnailPrompt?: string;
  hashtags?: string[];
  keywords?: string[];
  shortsHooks: any[]
}

export interface IStory extends Document {
  user?: Types.ObjectId; // optional if you want authentication
  prompt: string;
  targetWords: number;
  totalChapters: number;
  outline: IOutlineItem[];
  characterProfile?: string;
  summary: string;
  // Story metadata for outline generation
  storyTitle?: string;
  characters?: string[];
  settings?: string[];
  themes?: string[];
  tone?: string;
  chapters: IChapter[];
  chapterImagePrompts: IChapterImagePrompts[];
  characterDetails: ICharacterDetails[]; // Stored character visual details for consistency
  youtubeAssets: IYouTubeAssets;
  status: "in_progress" | "chapters_complete" | "assets_complete" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

interface IChapterImagePrompts {
  chapter: number;            // which chapter these prompts belong to
  prompts: string[];          // one prompt per paragraph
}

export interface ICharacterDetails {
  name: string;
  age?: string;
  attire?: string;
  facialFeatures?: string;
  physicalTraits?: string;
  otherDetails?: string;
  lastUpdatedChapter?: number; // Track when details were last updated
  updateReason?: string; // Reason for update (plot development, outline change, etc.)
}

const paragraphSchema = new Schema<IParagraph>({
  text: { type: String, required: true },
  imagePrompt: { type: String },
});

const chapterImagePromptsSchema = new Schema<IChapterImagePrompts>({
  chapter: { type: Number, required: true },
  prompts: [{ type: String, required: true }],
});

const characterDetailsSchema = new Schema<ICharacterDetails>({
  name: { type: String, required: true, trim: true },
  age: { type: String, trim: true },
  attire: { type: String, trim: true },
  facialFeatures: { type: String, trim: true },
  physicalTraits: { type: String, trim: true },
  otherDetails: { type: String, trim: true },
  lastUpdatedChapter: { type: Number },
  updateReason: { type: String, trim: true },
});

const outlineItemSchema = new Schema<IOutlineItem>({
  number: { type: Number, required: true },
  purpose: { type: String, required: true },
  description: { type: String, required: true },
});
 
const chapterSchema = new Schema<IChapter>({
  number: { type: Number, required: true },
  title: { type: String },
  content: { type: String, required: true },
  summary: { type: String }, // Short summary for continuity
  wordCount: { type: Number },
  paragraphs: [paragraphSchema],
});

const youtubeAssetsSchema = new Schema<IYouTubeAssets>({
  synopsis: { type: String },
  titles: [{ type: String }],
  description: { type: String },
  thumbnailPrompt: { type: String },
  hashtags: [{ type: String }],
  keywords: [{ type: String }],
  shortsHooks: [{type: String}]
});

const storySchema = new Schema<IStory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    prompt: { type: String, required: true },
    targetWords: { type: Number, required: true },
    totalChapters: { type: Number, required: true },
    outline: [outlineItemSchema],
    summary: { type: String, required: true },
    characterProfile: { type: String },
    // Story metadata for outline generation
    storyTitle: { type: String },
    characters: [{ type: String }],
    settings: [{ type: String }],
    themes: [{ type: String }],
    tone: { type: String },
    chapters: [chapterSchema],
   chapterImagePrompts: [chapterImagePromptsSchema],
    characterDetails: [characterDetailsSchema], // Stored character visual details
    youtubeAssets: {
      type: youtubeAssetsSchema, default: {
      synopsis: "",
  titles: [],
  description: "",
  thumbnailPrompt: "", 
        hashtags: [],
  keywords: [],
  shortsHooks: []
    } },
    status: {
      type: String,
      enum: [
        "in_progress",
        "chapters_complete",
        "assets_complete",
        "completed",
      ],
      default: "in_progress",
    },
  },
  { timestamps: true }
);

export const Story = model<IStory>("Story", storySchema);
