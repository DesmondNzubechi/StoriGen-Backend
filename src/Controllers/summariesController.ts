import { NextFunction, Request, Response } from 'express';
import { Summary, ISummary } from '../Models/Summary';
import { Idea } from '../Models/Idea';
import { AIService } from '../Services/aiService';
import { AppError } from '../errors/appError';
import catchAsync from '../utils/catchAsync';

type AuthenticatedRequest = Request & {
  user?: any;
};

/**
 * Generate summary from an idea using AIService
 */
export const generateSummary = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { idea, customizations = {} } = req.body;
  const { tone, style, targetAudience, niche, themes, settings } = customizations;
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  if (!idea) {
    return res.status(400).json({
      success: false,
      message: 'Idea is required',
    });
  }

  const summaryData = await AIService.generateViralSummary(idea.content, {
    tone,
    style,
    targetAudience,
    niche,
    themes,
    settings,
  });

  if (!summaryData || typeof summaryData !== 'object') {
    return res.status(500).json({
      success: false,
      message: 'AI did not return a valid summary object',
      raw: summaryData,
    });
  }

  const summary = await Summary.create({
    user: user._id,
    idea,
    ...summaryData,
  });

  res.status(201).json({
    success: true,
    data: summary,
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
    .populate('idea', 'title theme setting')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.status(200).json({
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

  const summary = await Summary.findOne({ _id: id, user: user._id })
    .populate('idea', 'title theme setting characters');

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
  ).populate('idea', 'title theme setting');

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
