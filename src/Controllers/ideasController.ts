import { NextFunction, Request, Response } from 'express';
import { Idea, IIdea } from '../Models/Idea';
import { AIService } from '../Services/aiService';
import { AppError } from '../errors/appError';
import { verifyTokenAndGetUser } from '../utils/verifyTokenAndGetUser';


/**
 * Generate and auto-save ideas
 */
export const generateIdeas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tone, style, targetAudience, niche, themes, settings } = req.body;

    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Generate ideas with AI (returns string[])
    const ideas = await AIService.generateViralIdeas({
      tone,
      style,
      targetAudience, 
      niche,
      themes,
      settings,
    });

    // Parse and save each idea
    const savedIdeas = await Promise.all(
      ideas.map((ideaText: string) => {
        // Extract title and content
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
      data:  savedIdeas ,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error generating ideas",
      error: error.message,
    });
  }
};



/**
 * Create a new idea
 */
export const createIdea = async (req: Request, res: Response) => {
  try {
    const {
      title,
      content,
      theme,
      setting, 
      characters,
      tone,
      style,
      targetAudience
    } = req.body;

    if (!title || !content || !theme || !setting) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, theme, and setting are required'
      });
    }

    const idea = await Idea.create({
      user: (req as any).user._id,
      title,
      content,
      theme,
      setting,
      characters: characters || [],
      tone: tone || 'dramatic',
      style: style || 'viral',
      targetAudience: targetAudience || 'adults'
    });

    res.status(201).json({
      success: true,
      data: { idea }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating idea',
      error: error.message
    });
  }
};


/**
 * Get all ideas for the logged-in user
 */
export const getUserIdeas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    const ideas = await Idea.find({ user: user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: ideas,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching user ideas",
      error: error.message,
    });
  }
};


export const getIdeas = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, theme, tone, style } = req.query;

    const filter: any = { user: (req as any).user._id };
    
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
          hasPrevPage: Number(page) > 1
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ideas',
      error: error.message
    });
  }
};

/**
 * Get a single idea by ID
 */
export const getIdeaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const idea = await Idea.findOne({ _id: id, user: (req as any).user._id });
    
    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { idea }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching idea',
      error: error.message
    });
  }
};

/**
 * Update an idea
 */
export const updateIdea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const idea = await Idea.findOneAndUpdate(
      { _id: id, user: (req as any).user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { idea }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating idea',
      error: error.message
    });
  }
};

/**
 * Delete an idea
 */
export const deleteIdea = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const idea = await Idea.findOneAndDelete({ _id: id, user: (req as any).user._id });

    if (!idea) {
      return res.status(404).json({
        success: false,
        message: 'Idea not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Idea deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting idea',
      error: error.message
    });
  }
};

/**
 * Toggle favorite for an idea
 */
export const toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ideaId } = req.params;

    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find the idea belonging to user
    const idea = await Idea.findOne({ _id: ideaId, user: user._id });
    if (!idea) {
      return res.status(404).json({
        success: false,
        message: "Idea not found",
      });
    }

    // Toggle favorite
    idea.favorite = !idea.favorite;
    await idea.save();

    res.status(200).json({
      success: true,
      data: { 
        idea, 
        message: `Idea ${idea.favorite ? "marked as favorite" : "removed from favorites"}` 
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error updating favorite status",
      error: error.message,
    });
  }
};
