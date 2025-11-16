import { NextFunction, Request, Response } from 'express';
import { Summary, ISummary } from '../Models/Summary';
import { AIService } from '../Services/aiService';
import { AppError } from '../errors/appError';
import catchAsync from '../utils/catchAsync';

type AuthenticatedRequest = Request & {
  user?: any;
};

/**
 * Generate summaries using AIService
 * Returns 10 unique summaries based on customization parameters
 */
export const generateSummary = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const {tone, targetAudience, niche, themes, settings } = req.body;
 
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const summariesData = await AIService.generateViralSummary(
    tone,
    targetAudience,
    niche,
    themes, 
    settings,
  );

  if (!summariesData || !Array.isArray(summariesData) || summariesData.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'AI did not return valid summaries',
      raw: summariesData,
    });
  }

  // Map the summary data directly to the Summary model structure
  const summariesToSave = summariesData.map((summaryItem: any) => {
    // Use themes from summary or fallback to provided themes
    const summaryThemes = summaryItem.themes || (themes ? themes.split(',').map((t: string) => t.trim()) : []);
    
    return {
      user: user._id,
      title: summaryItem.title || "Untitled Story",
      content: summaryItem.content || "",
      niche: summaryItem.niche || niche || "story",
      mainCharacters: Array.isArray(summaryItem.mainCharacters) 
        ? summaryItem.mainCharacters 
        : (summaryItem.mainCharacters ? [summaryItem.mainCharacters] : []),
      conflict: summaryItem.conflict || "A central conflict unfolds",
      resolution: summaryItem.resolution || "The story reaches its conclusion",
      moralLesson: summaryItem.moralLesson || "Every story teaches us something valuable",
      themes: summaryThemes.length > 0 ? summaryThemes : ["storytelling"],
    };
  });

  // Save all summaries
  const savedSummaries = await Summary.insertMany(summariesToSave);

  res.status(201).json({
    success: true,
    count: savedSummaries.length,
    data: savedSummaries,
  });
});



/**
 * Get all summaries for the authenticated user
 */
export const getSummaries = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const summaries = await Summary.find({ user: user._id })
    .sort({ createdAt: -1 })
    // .skip(skip)
    // .limit(Number(limit));

  res.status(200).json({
    count : summaries.length,
    success: true,
    data: summaries,
  });
}); 

/**
 * Get a single summary by ID
 */
export const getSummaryById = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const { id } = req.params;

  const summary = await Summary.findOne({ _id: id, user: user._id });

  if (!summary) {
    return res.status(404).json({
      success: false,
      message: 'Summary not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { summary },
  });
});

/**
 * Update a summary
 */
export const updateSummary = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const { id } = req.params;
  const updateData = req.body;

  const summary = await Summary.findOneAndUpdate(
    { _id: id, user: user._id },
    updateData,
    { new: true, runValidators: true }
  );

  if (!summary) {
    return res.status(404).json({
      success: false,
      message: 'Summary not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { summary },
  });
});

/**
 * Delete a summary
 */
export const deleteSummary = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const { id } = req.params;

  const summary = await Summary.findOneAndDelete({ _id: id, user: user._id });

  if (!summary) {
    return res.status(404).json({
      success: false,
      message: 'Summary not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Summary deleted successfully',
  });
});
