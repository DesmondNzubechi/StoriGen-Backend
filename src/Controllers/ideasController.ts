import { NextFunction, Request, Response } from 'express';
import { Idea, IIdea } from '../Models/Idea';
import { AIService } from '../Services/aiService';
import { AppError } from '../errors/appError';
import catchAsync from '../utils/catchAsync';

type AuthenticatedRequest = Request & {
  user?: any;
};

/**
 * Generate and auto-save ideas
 */
export const generateIdeas = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { tone, style, targetAudience, niche, themes, settings } = req.body;
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const ideas = await AIService.generateViralIdeas({
    tone,
    style,
    targetAudience,
    niche,
    themes,
    settings,
  });

  const savedIdeas = await Promise.all(
    ideas.map((ideaText: string) => {
      const match = ideaText.match(/^\d+\.\s*\*\*(.*?)\*\*\s*(.+)$/s);
      const title = match ? match[1].trim() : "Untitled Idea";
      const content = match ? match[2].trim() : ideaText;

      return Idea.create({
        user: user._id,
        title,
        content,
        theme: themes || "general",
        setting: settings || "unspecified",
        characters: [],
        tone: tone || "dramatic",
        style: style || "viral",
        targetAudience: targetAudience || "adults",
        niche: niche || "general",
        favorite: false,
        status: "draft",
      });
    })
  );

  res.status(201).json({
    success: true,
    data: savedIdeas,
  });
});

/**
 * Create a new idea
 */
export const createIdea = catchAsync<AuthenticatedRequest>(async (req, res) => {
  const {
    title,
    content,
    theme,
    setting,
    characters,
    tone,
    style,
    targetAudience,
  } = req.body;

  if (!title || !content || !theme || !setting) {
    return res.status(400).json({
      success: false,
      message: 'Title, content, theme, and setting are required',
    });
  }

  const idea = await Idea.create({
    user: req.user!._id,
    title,
    content,
    theme,
    setting,
    characters: characters || [],
    tone: tone || 'dramatic',
    style: style || 'viral',
    targetAudience: targetAudience || 'adults',
  });

  res.status(201).json({
    success: true,
    data: { idea },
  });
});

/**
 * Get all ideas for the logged-in user
 */
export const getUserIdeas = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const ideas = await Idea.find({ user: user._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: ideas,
  });
});

export const getIdeas = catchAsync<AuthenticatedRequest>(async (req, res) => {
  const { page = 1, limit = 10, theme, tone, style } = req.query;
  const user = req.user!;

  const filter: any = { user: user._id };

  if (theme) filter.theme = { $regex: theme, $options: 'i' };
  if (tone) filter.tone = tone;
  if (style) filter.style = style;

  const skip = (Number(page) - 1) * Number(limit);

  const ideas = await Idea.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Idea.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      ideas,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
        hasPrevPage: Number(page) > 1,
      },
    },
  });
});

/**
 * Get a single idea by ID
 */
export const getIdeaById = catchAsync<AuthenticatedRequest>(async (req, res) => {
  const { id } = req.params;

  const idea = await Idea.findOne({ _id: id, user: req.user!._id });

  if (!idea) {
    return res.status(404).json({
      success: false,
      message: 'Idea not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { idea },
  });
});

/**
 * Update an idea
 */
export const updateIdea = catchAsync<AuthenticatedRequest>(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const idea = await Idea.findOneAndUpdate(
    { _id: id, user: req.user!._id },
    updateData,
    { new: true, runValidators: true }
  );

  if (!idea) {
    return res.status(404).json({
      success: false,
      message: 'Idea not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { idea },
  });
});

/**
 * Delete an idea
 */
export const deleteIdea = catchAsync<AuthenticatedRequest>(async (req, res) => {
  const { id } = req.params;

  const idea = await Idea.findOneAndDelete({ _id: id, user: req.user!._id });

  if (!idea) {
    return res.status(404).json({
      success: false,
      message: 'Idea not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Idea deleted successfully',
  });
});

/**
 * Toggle favorite for an idea
 */
export const toggleFavorite = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { ideaId } = req.params;
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const idea = await Idea.findOne({ _id: ideaId, user: user._id });
  if (!idea) {
    return res.status(404).json({
      success: false,
      message: "Idea not found",
    });
  }

  idea.favorite = !idea.favorite;
  await idea.save();

  res.status(200).json({
    success: true,
    data: {
      idea,
      message: `Idea ${idea.favorite ? "marked as favorite" : "removed from favorites"}`,
    },
  });
});
