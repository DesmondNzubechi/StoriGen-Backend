import { NextFunction, Request, Response } from "express";
import ShortsModel from "../Models/shortsModel";
import { AIService } from "../Services/aiService";
import { AppError } from "../errors/appError";
import catchAsync from "../utils/catchAsync";

type AuthenticatedRequest = Request & {
  user?: any;
};

export const generateShort = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { typeOfMotivation, theme, targetWord } = req.body;
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  if (!typeOfMotivation || !theme || !targetWord) {
    return res.status(400).json({
      status: "fail",
      message: "typeOfMotivation, theme, and target word are required.",
    });
  }

  const aiResult = await AIService.generateMotivationalSpeech({
    typeOfMotivation,
    theme,
    targetWord,
  });

  const newShort = await ShortsModel.create({
    title: aiResult.title,
    caption: aiResult.caption,
    hashTag: aiResult.hashTag,
    content: aiResult.content,
    imagePrompts: aiResult.imagePrompts,
    theme,
    typeOfMotivation,
    user: user._id,
  });

  res.status(201).json({
    status: "success",
    message: "Motivational short generated successfully.",
    data: newShort,
  });
});

export const getAllShorts = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  const allTheShorts = await ShortsModel.find();

  res.status(200).json({
    status: "success",
    results: allTheShorts.length,
    data: allTheShorts,
  });
});

export const getShortByIdOrSlug = catchAsync(async (req: Request, res: Response) => {
  const { idOrSlug } = req.params;

  let short;
  if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    short = await ShortsModel.findById(idOrSlug);
  } else {
    short = await ShortsModel.findOne({ slug: idOrSlug });
  }

  if (!short) {
    return res.status(404).json({
      status: "fail",
      message: "Motivational short not found.",
    });
  }

  res.status(200).json({
    status: "success",
    data: short,
  });
});

export const deleteShort = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await ShortsModel.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json({
      status: "fail",
      message: "Motivational short not found.",
    });
  }

  res.status(200).json({
    status: "success",
    message: "Motivational short deleted successfully.",
  });
});
