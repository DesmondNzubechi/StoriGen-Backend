import { NextFunction, Request, Response } from "express";
import ShortsModel from "../Models/shortsModel";
import { AIService } from "../Services/aiService";
import { verifyTokenAndGetUser } from "../utils/verifyTokenAndGetUser";
import { AppError } from "../errors/appError";


  // Generate motivational short via AI
  export const generateShort = async (req: Request, res: Response, next : NextFunction) => {
    try {
        const { typeOfMotivation, theme, targetWord} = req.body;
         
       const token = req.cookies.jwt;
            
              if (!token) {
                return next(
                  new AppError("You are not authorised to access this route", 401)
                );
              }
             
        const user = await verifyTokenAndGetUser(token, next);
        
        if (!user) {
            return next(new AppError("User does not exist. Kindly register", 404))
        }

      if (!typeOfMotivation || !theme || !targetWord) {
        return res.status(400).json({
          status: "fail",
          message: "typeOfMotivation, theme, and target word are required.",
        });
      }

      // Generate using AI Service
      const aiResult = await AIService.generateMotivationalSpeech({
        typeOfMotivation,
        theme,
        targetWord,
      });
        
        console.log("The result", aiResult)

      // Save to DB
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

      return res.status(201).json({
        status: "success",
        message: "Motivational short generated successfully.",
        data: newShort,
      });
    } catch (error: any) {
      console.error("❌ Error generating short:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to generate motivational short.",
        error: error.message,
      });
    }
  }

  // Get all shorts (with optional filters)
export const getAllShorts = async (req: Request, res: Response, next : NextFunction) => {
      
    try {

        const token = req.cookies.jwt;
             
               if (!token) {
                 return next(
                   new AppError("You are not authorised to access this route", 401)
                 );
               }
              
        const user = await verifyTokenAndGetUser(token, next);

        if (!user) {
            return next(new AppError("Cant find user with this token. Please login again", 401))
        }
        
        const allTheShorts = await ShortsModel.find()

    //   const { typeOfMotivation, theme, search } = req.query;

    //   const filter: any = {};
    //   if (typeOfMotivation) filter.typeOfMotivation = typeOfMotivation;
    //   if (theme) filter.theme = theme;

    //   let query = ShortsModel.find(filter).sort({ createdAt: -1 });

    //   //Text search
    //   if (search) {
    //     query = ShortsModel.find({
    //       ...filter,
    //       $text: { $search: search as string },
    //     });
    //   }

    //   const shorts = await query;

      res.status(200).json({
        status: "success",
        results: allTheShorts.length,
        data: allTheShorts,
      });
    } catch (error: any) {
      console.error("❌ Error fetching shorts:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch motivational shorts.",
        error: error.message,
      });
    }
  }

  // Get single short by ID or slug
export const getShortByIdOrSlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
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
    } catch (error: any) {
      console.error("❌ Error fetching short:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch motivational short.",
        error: error.message,
      });
    }
  }

  // Delete a short
  export const deleteShort = async (req: Request, res: Response) => {
    try {
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
    } catch (error: any) {
      console.error("❌ Error deleting short:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete motivational short.",
        error: error.message,
      });
    }
  }

