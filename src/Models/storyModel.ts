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
}

export interface IStory extends Document {
  user?: Types.ObjectId; // optional if you want authentication
  prompt: string;
  targetWords: number;
  totalChapters: number;
  outline: IOutlineItem[];
  characterProfile?: string;
  summary: string;
  chapters: IChapter[];
  youtubeAssets: IYouTubeAssets;
  status: "in_progress" | "chapters_complete" | "assets_complete" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const paragraphSchema = new Schema<IParagraph>({
  text: { type: String, required: true },
  imagePrompt: { type: String },
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
  wordCount: { type: Number },
  paragraphs: [paragraphSchema],
});

const youtubeAssetsSchema = new Schema<IYouTubeAssets>({
  synopsis: { type: String },
  titles: [{ type: String }],
  description: { type: String },
  thumbnailPrompt: { type: String },
  hashtags: [{ type: String }],
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
    chapters: [chapterSchema],
    youtubeAssets: {
      type: youtubeAssetsSchema, default: {
      synopsis: "",
  titles: [],
  description: "",
  thumbnailPrompt: "",
  hashtags: [],
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
