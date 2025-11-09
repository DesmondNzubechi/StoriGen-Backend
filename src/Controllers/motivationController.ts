import { NextFunction, Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { ParsedQs } from "qs";
import { Motivation, IMotivation } from "../Models/Motivation";
import { AppError } from "../errors/appError";
import { validateObjectId } from "../utils/validateObjectId";
import { AIService } from "../Services/aiService";
import { IUser } from "../Models/userModel";

type ThemeInput =
  | string
  | string[]
  | ParsedQs
  | ParsedQs[]
  | (string | ParsedQs)[]
  | undefined;

const normalizeThemes = (theme: ThemeInput): string[] => {
  if (!theme) {
    return [];
  }

  const toStringValue = (value: string | ParsedQs): string => {
    if (typeof value === "string") {
      return value;
    }

    return Object.values(value)
      .map((part) => (typeof part === "string" ? part : ""))
      .join(",");
  };

  if (Array.isArray(theme)) {
    return theme
      .map((item) => toStringValue(item))
      .flatMap((entry) =>
        entry
          .split(",")
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 0)
      );
  }

  if (typeof theme === "object") {
    const serialized = toStringValue(theme);
    return serialized
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (typeof theme === "string") {
    return theme
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
};

type GeneratedMotivationPayload = {
  content: string;
  caption: string;
};

type AuthenticatedRequest = Request & {
  user?: IUser;
  authToken?: string;
};


export const generateMotivation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tone, theme, type, targetLength } = req.body;

    if (!tone || typeof tone !== "string" || !tone.trim()) {
      return next(
        new AppError("tone is required when generating motivation.", 400)
      );
    }

    if (!type || typeof type !== "string" || !type.trim()) {
      return next(
        new AppError("type is required when generating motivation.", 400)
      );
    }

    const themes = normalizeThemes(theme);
    if (themes.length === 0) {
      return next(
        new AppError(
          "Provide at least one theme when generating motivation.",
          400
        )
      );
    }

    if (targetLength === undefined || targetLength === null) {
      return next(
        new AppError(
          "targetLength is required when generating motivation.",
          400
        )
      );
    }

    const numericTargetLength =
      typeof targetLength === "number" 
        ? targetLength
        : parseInt(targetLength, 10);

    if (Number.isNaN(numericTargetLength) || numericTargetLength <= 0) {
      return next(
        new AppError("targetLength must be a positive number.", 400)
      );
    }

    const normalizedTone = tone.trim();
    const normalizedType = type.trim();

    const { user } = req as AuthenticatedRequest;

    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    let generatedMotivations: GeneratedMotivationPayload[] = [];

    try {
      generatedMotivations = await AIService.generateMotivations({
        tone: normalizedTone,
        type: normalizedType,
        themes,
        targetLength: numericTargetLength,
      });
    } catch (error) {
      console.error("AI motivation generation failed:", error);
    }

    const sanitizedPayloads = generatedMotivations.map(
      ({ content, caption }) => {
        const trimmedContent = content.trim();
        const trimmedCaption = caption.trim();
        const fallbackCaption =
          trimmedCaption ||
          `${trimmedContent.split(".")[0] ?? trimmedContent}.`.trim();

        return {
          content: trimmedContent,
          caption: fallbackCaption,
        };
      }
    );

    const savedMotivations = await Motivation.insertMany(
      sanitizedPayloads.map((payload) => ({
        ...payload,
        tone: normalizedTone,
        theme: themes,
        type: normalizedType,
        targetLength: numericTargetLength,
        createdBy: user._id,
      }))
    );

    res.status(201).json({
      success: true,
      data: savedMotivations,
    });
  } catch (error) {
    next(error);
  }
};

export const generateSpeechForMotivation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return next(new AppError("Invalid motivation id supplied.", 400));
    }

    const motivation = await Motivation.findById(id);

    if (!motivation) {
      return next(new AppError("Motivation not found.", 404));
    }

    const content = motivation.content?.trim();

    if (!content) {
      return next(
        new AppError(
          "Motivation content is empty. Cannot generate speech.",
          400
        )
      );
    }

    const sanitizedContent = content
      .replace(/(^|\s)(#[^\s]+)/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!sanitizedContent) {
      return next(
        new AppError(
          "Motivation content contains only hashtags. Cannot generate speech.",
          400
        )
      );
    }

    const voiceId =
      typeof req.body.voiceId === "string" &&
      req.body.voiceId.trim().length > 0
        ? req.body.voiceId.trim()
        : "nPczCjzI2devNBz1zQrb";
    
    const receiveUrl =
      typeof req.body.receiveUrl === "string" &&
      req.body.receiveUrl.trim().length > 0
        ? req.body.receiveUrl.trim()
        : undefined;
    
    const modelId =
      typeof req.body.modelId === "string" &&
      req.body.modelId.trim().length > 0
        ? req.body.modelId.trim()
        : "eleven_multilingual_v2";
    
    const withTranscript =
      typeof req.body.withTranscript === "boolean"
        ? req.body.withTranscript
        : req.body.withTranscript === "false";

    let speechResult: Awaited<
      ReturnType<typeof AIService.generateMotivationSpeechAudio>
    >;

    try {
      speechResult = await AIService.generateMotivationSpeechAudio({
        text: sanitizedContent,
        voiceId,
        receiveUrl,
        modelId,
        withTranscript,
      });
    } catch (error) {
      console.error("Speech generation failed:", error);
      return next(
        new AppError(
          "Failed to generate speech audio for motivational content.",
          502
        )
      );
    }

    if (speechResult.status !== "done" || !speechResult.audioUrl) {
      return next(
        new AppError(
          "Speech generation did not complete successfully. Please try again.",
          504
        )
      );
    }

    motivation.audioUrl = speechResult.audioUrl;
    motivation.audioTaskId = speechResult.taskId;

    await motivation.save();

    res.status(200).json({
      success: true,
      data: motivation,
    });
  } catch (error) {
    next(error);
  }
};


export const getAllMotivations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tone, theme, type, page = "1", limit = "20", search } = req.query;

    const filter: FilterQuery<IMotivation> = {};

    if (typeof tone === "string" && tone.trim()) {
      filter.tone = tone.trim();
    }

    if (typeof type === "string" && type.trim()) {
      filter.type = type.trim();
    }

    if (theme) {
      const themes = normalizeThemes(
        Array.isArray(theme) ? theme : theme.toString()
      );
      if (themes.length > 0) {
        filter.theme = { $in: themes };
      }
    }

    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { content: { $regex: regex } },
        { caption: { $regex: regex } },
        { hashtags: { $elemMatch: { $regex: regex } } },
      ];
    }

    const { user } = req as AuthenticatedRequest;

    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const { mine } = req.query;
    if (mine === "true") {
      filter.createdBy = user._id;
    }

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.max(Math.min(parseInt(limit as string, 10) || 20, 100), 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [motivations, total] = await Promise.all([
      Motivation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Motivation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      length: motivations.length,
      data: motivations,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
        hasNext: skip + motivations.length < total,
        hasPrev: parsedPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserMotivations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user } = req as AuthenticatedRequest;

    if (!user) {
      return next(
        new AppError("You are not authorised to access this route", 401)
      );
    }

    const { tone, theme, type, page = "1", limit = "20", search } = req.query;

    const filter: FilterQuery<IMotivation> = {
      createdBy: user._id,
    };

    if (typeof tone === "string" && tone.trim()) {
      filter.tone = tone.trim();
    }

    if (typeof type === "string" && type.trim()) {
      filter.type = type.trim();
    }

    if (theme) {
      const themes = normalizeThemes(
        Array.isArray(theme) ? theme : theme.toString()
      );
      if (themes.length > 0) {
        filter.theme = { $in: themes };
      }
    }

    if (typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { content: { $regex: regex } },
        { caption: { $regex: regex } },
      ];
    }

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.max(
      Math.min(parseInt(limit as string, 10) || 20, 100),
      1
    );
    const skip = (parsedPage - 1) * parsedLimit;

    const [motivations, total] = await Promise.all([
      Motivation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Motivation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      length: motivations.length,
      data: motivations,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
        hasNext: skip + motivations.length < total,
        hasPrev: parsedPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMotivationById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return next(new AppError("Invalid motivation id supplied.", 400));
    }

    const motivation = await Motivation.findById(id);

    if (!motivation) {
      return next(new AppError("Motivation not found.", 404));
    }

    res.status(200).json({
      success: true,
      data: motivation,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllMotivationsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authUser = (req as any).user as IUser | undefined;

    if (!authUser) {
      return next(
        new AppError("You are not authorised to access this route", 401)
      );
    }

    const {
      tone,
      theme,
      type,
      page = "1",
      limit = "20",
      search,
      userId,
    } = req.query;

    const filter: FilterQuery<IMotivation> = {};

    if (typeof tone === "string" && tone.trim()) {
      filter.tone = tone.trim();
    }

    if (typeof type === "string" && type.trim()) {
      filter.type = type.trim();
    }

    if (theme) {
      const themes = normalizeThemes(
        Array.isArray(theme) ? theme : theme.toString()
      );
      if (themes.length > 0) {
        filter.theme = { $in: themes };
      }
    }

    if (typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { content: { $regex: regex } },
        { caption: { $regex: regex } },
        { hashtags: { $elemMatch: { $regex: regex } } },
      ];
    }

    if (typeof userId === "string" && validateObjectId(userId)) {
      filter.createdBy = userId;
    }

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.max(
      Math.min(parseInt(limit as string, 10) || 20, 100),
      1
    );
    const skip = (parsedPage - 1) * parsedLimit;

    const [motivations, total] = await Promise.all([
      Motivation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate("createdBy", "fullName email role")
        .lean(),
      Motivation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: motivations,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
        hasNext: skip + motivations.length < total,
        hasPrev: parsedPage > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMotivation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return next(new AppError("Invalid motivation id supplied.", 400));
    }

    const motivation = await Motivation.findByIdAndDelete(id);

    if (!motivation) {
      return next(new AppError("Motivation not found.", 404));
    }

    res.status(200).json({
      success: true,
      message: "Motivation deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateMotivation = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return next(new AppError("Invalid motivation id supplied.", 400));
    }

    const allowedFields: Array<
      keyof Pick<
        IMotivation,
        "content" | "tone" | "type" | "theme" | "targetLength" | "caption" 
      >
    > = ["content", "tone", "type", "theme", "targetLength", "caption"];

    const updateData: Partial<IMotivation> = {};

    allowedFields.forEach((field) => {
      if (field in req.body) {
        if (field === "theme") {
          updateData.theme = normalizeThemes(req.body.theme);
        } else if (field === "caption") {
          if (typeof req.body.caption === "string" && req.body.caption.trim()) {
            updateData.caption = req.body.caption.trim();
          } else {
            updateData.caption = undefined;
          }
        } else if (field === "targetLength") {
          const numericValue =
            typeof req.body.targetLength === "number"
              ? req.body.targetLength
              : parseInt(req.body.targetLength, 10);
          if (!Number.isNaN(numericValue)) {
            updateData.targetLength = numericValue;
          }
        } else if (typeof req.body[field] === "string") {
          updateData[field] = req.body[field].trim();
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return next(
        new AppError("No valid fields supplied for update.", 400)
      );
    }

    const motivation = await Motivation.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!motivation) {
      return next(new AppError("Motivation not found.", 404));
    }

    res.status(200).json({
      success: true,
      data: motivation,
    });
  } catch (error) {
    next(error);
  }
};

