// import { Request, Response } from "express";
// import { Story } from "../Models/storyModel";
// import { generateOutline, generateChapter, generateImagePrompts, generateDescription, generateTitles, generateThumbnailPrompt } from "../Services/aiService";

// // ==========================
// // INIT STORY
// // ==========================
// export const initStory = async (req: Request, res: Response) => {
//   try {
//     const { prompt, targetWords, targetChapters } = req.body;
//     if (!prompt || !targetWords || !targetChapters) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // Generate outline
//     const outline = await generateOutline(prompt, targetWords, targetChapters);

//     // Create new story doc
//     const story = await Story.create({
//       user: (req as any).user?._id,
//       prompt,
//       targetWords,
//       targetChapters,
//       outline,
//       chapters: [],
//       youtubeAssets: {},
//       status: "in_progress",
//     });

//     res.status(201).json(story);
//   } catch (error: any) {
//     res.status(500).json({ message: "Error initializing story", error: error.message });
//   }
// };

// // ==========================
// // GENERATE CHAPTER
// // ==========================
// export const generateStoryChapter = async (req: Request, res: Response) => {
//   try {
//     const { storyId } = req.params;
//     const { chapterNumber } = req.body;

//     const story = await Story.findById(storyId);
//     if (!story) return res.status(404).json({ message: "Story not found" });

//     if (chapterNumber > story.targetChapters) {
//       return res.status(400).json({ message: "Chapter number exceeds targetChapters" });
//     }

//     const chapterText = await generateChapter(
//       story.outline || "",
//       chapterNumber,
//       story.targetChapters,
//       story.targetWords
//     );

//     // Split chapter into paragraphs
//     const paragraphs = chapterText
//       .split("\n\n")
//       .map((p) => p.trim())
//       .filter(Boolean)
//       .map((p) => ({ text: p }));

//     const newChapter = {
//       number: chapterNumber,
//       title: `Chapter ${chapterNumber}`,
//       text: chapterText,
//       paragraphs,
//     };

//     story.chapters.push(newChapter);
//     await story.save();

//     res.json(newChapter);
//   } catch (error: any) {
//     res.status(500).json({ message: "Error generating chapter", error: error.message });
//   }
// };

// // ==========================
// // GENERATE IMAGE PROMPTS (PER PARAGRAPH)
// // ==========================
// export const generateChapterImagePrompts = async (req: Request, res: Response) => {
//   try {
//     const { storyId, chapterNumber } = req.params;

//     const story = await Story.findById(storyId);
//     if (!story) return res.status(404).json({ message: "Story not found" });

//     const chapter = story.chapters.find((c) => c.number === Number(chapterNumber));
//     if (!chapter) return res.status(404).json({ message: "Chapter not found" });

//     // Generate image prompts for each paragraph
//     for (let i = 0; i < chapter.paragraphs.length; i++) {
//       const imagePrompt = await generateImagePrompts(chapter.paragraphs[i].text, story.prompt);
//       chapter.paragraphs[i].imagePrompt = imagePrompt;
//     }

//     await story.save();
//     res.json(chapter.paragraphs);
//   } catch (error: any) {
//     res.status(500).json({ message: "Error generating image prompts", error: error.message });
//   }
// };

// // ==========================
// // GENERATE DESCRIPTION
// // ==========================
// export const generateStoryDescription = async (req: Request, res: Response) => {
//   try {
//     const { storyId } = req.params;
//     const story = await Story.findById(storyId);
//     if (!story) return res.status(404).json({ message: "Story not found" });

//     const fullStory = story.chapters.map((c) => c.text).join("\n\n");
//     const description = await generateDescription(fullStory);
//     story.youtubeAssets.description = description;

//     await story.save();
//     res.json({ description });
//   } catch (error: any) {
//     res.status(500).json({ message: "Error generating description", error: error.message });
//   }
// };

// // ==========================
// // GENERATE TITLES
// // ==========================
// export const generateStoryTitles = async (req: Request, res: Response) => {
//   try {
//     const { storyId } = req.params;
//     const story = await Story.findById(storyId);
//     if (!story) return res.status(404).json({ message: "Story not found" });

//     const fullStory = story.chapters.map((c) => c.text).join("\n\n");
//     const titlesRaw = await generateTitles(fullStory);
//     const titles = titlesRaw
//       .split(/\n|\r|\r\n/g)
//       .map((t) => t.replace(/^[-*\d\.\)\s]+/, "").trim())
//       .filter(Boolean);
//     story.youtubeAssets.titles = titles;

//     await story.save();
//     res.json({ titles });
//   } catch (error: any) {
//     res.status(500).json({ message: "Error generating titles", error: error.message });
//   }
// };

// // ==========================
// // GENERATE THUMBNAIL PROMPT
// // ==========================
// export const generateStoryThumbnail = async (req: Request, res: Response) => {
//   try {
//     const { storyId } = req.params;
//     const story = await Story.findById(storyId);
//     if (!story) return res.status(404).json({ message: "Story not found" });

//     const fullStory = story.chapters.map((c) => c.text).join("\n\n");
//     const thumbnailPrompt = await generateThumbnailPrompt(fullStory);
//     story.youtubeAssets.thumbnailPrompt = thumbnailPrompt;

//     // Final update → assets_complete
//     story.status = "assets_complete";
//     await story.save();

//     res.json({ thumbnailPrompt });
//   } catch (error: any) {
//     res.status(500).json({ message: "Error generating thumbnail prompt", error: error.message });
//   }
// };

// // ==========================
// // FETCH USER STORIES WITH PAGINATION
// // ==========================
// export const getUserStories = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user?._id;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const status = req.query.status as string;
//     const search = req.query.search as string;
//     const sortBy = req.query.sortBy as string || 'createdAt';
//     const sortOrder = req.query.sortOrder as string || 'desc';

//     // Build filter object
//     const filter: any = { user: userId };
    
//     if (status) {
//       filter.status = status;
//     }
    
//     if (search) {
//       filter.$or = [
//         { prompt: { $regex: search, $options: 'i' } },
//         { 'chapters.title': { $regex: search, $options: 'i' } }
//       ];
//     }

//     // Build sort object
//     const sort: any = {};
//     sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

//     // Calculate pagination
//     const skip = (page - 1) * limit;

//     // Execute query with pagination
//     const stories = await Story.find(filter)
//       .sort(sort)
//       .skip(skip)
//       .limit(limit)
//       .select('-chapters.paragraphs.imagePrompt'); // Exclude image prompts for list view

//     // Get total count for pagination
//     const totalStories = await Story.countDocuments(filter);
//     const totalPages = Math.ceil(totalStories / limit);

//     res.json({
//       stories,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalStories,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1
//       }
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: "Error fetching user stories", error: error.message });
//   }
// };

// // ==========================
// // FETCH ONE STORY BY ID (WITH USER VALIDATION)
// // ==========================
// export const getStoryById = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user?._id;
//     const storyId = req.params.id;

//     const story = await Story.findOne({
//       _id: storyId,
//       user: userId
//     });

//     if (!story) {
//       return res.status(404).json({
//         message: "Story not found or you don't have permission to access it"
//       });
//     }

//     res.json(story);
//   } catch (error: any) {
//     res.status(500).json({ message: "Error fetching story", error: error.message });
//   }
// };

// // ==========================
// // FETCH USER STORY STATISTICS
// // ==========================
// export const getUserStoryStats = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user?._id;

//     const stats = await Story.aggregate([
//       { $match: { user: userId } },
//       {
//         $group: {
//           _id: null,
//           totalStories: { $sum: 1 },
//           totalWords: { $sum: '$targetWords' },
//           totalChapters: { $sum: { $size: '$chapters' } },
//           completedStories: {
//             $sum: {
//               $cond: [{ $eq: ['$status', 'assets_complete'] }, 1, 0]
//             }
//           },
//           inProgressStories: {
//             $sum: {
//               $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
//             }
//           },
//           chaptersCompleteStories: {
//             $sum: {
//               $cond: [{ $eq: ['$status', 'chapters_complete'] }, 1, 0]
//             }
//           }
//         }
//       }
//     ]);

//     const result = stats[0] || {
//       totalStories: 0,
//       totalWords: 0,
//       totalChapters: 0,
//       completedStories: 0,
//       inProgressStories: 0,
//       chaptersCompleteStories: 0
//     };

//     res.json(result);
//   } catch (error: any) {
//     res.status(500).json({ message: "Error fetching story statistics", error: error.message });
//   }
// };

// // ==========================
// // SEARCH USER STORIES
// // ==========================
// export const searchUserStories = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user?._id;
//     const { q, status, dateFrom, dateTo, sortBy, sortOrder } = req.query;

//     // Build search filter
//     const filter: any = { user: userId };

//     if (q) {
//       filter.$or = [
//         { prompt: { $regex: q, $options: 'i' } },
//         { 'chapters.title': { $regex: q, $options: 'i' } },
//         { 'chapters.text': { $regex: q, $options: 'i' } }
//       ];
//     }

//     if (status) {
//       filter.status = status;
//     }

//     if (dateFrom || dateTo) {
//       filter.createdAt = {};
//       if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
//       if (dateTo) filter.createdAt.$lte = new Date(dateTo as string);
//     }

//     // Build sort object
//     const sort: any = {};
//     sort[sortBy as string || 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

//     const stories = await Story.find(filter)
//       .sort(sort)
//       .select('-chapters.paragraphs.imagePrompt')
//       .limit(50); // Limit search results

//     res.json({
//       stories,
//       totalResults: stories.length,
//       searchQuery: q
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: "Error searching stories", error: error.message });
//   }
// };

// // ==========================
// // GET STORY BY STATUS
// // ==========================
// export const getStoriesByStatus = async (req: Request, res: Response) => {
//   try {
//     const userId = (req as any).user?._id;
//     const status = req.params.status;
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;

//     // Validate status
//     const validStatuses = ['in_progress', 'chapters_complete', 'assets_complete'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         message: "Invalid status. Must be one of: in_progress, chapters_complete, assets_complete"
//       });
//     }

//     const skip = (page - 1) * limit;

//     const stories = await Story.find({
//       user: userId,
//       status: status
//     })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .select('-chapters.paragraphs.imagePrompt');

//     const totalStories = await Story.countDocuments({
//       user: userId,
//       status: status
//     });
//     const totalPages = Math.ceil(totalStories / limit);

//     res.json({
//       stories,
//       status,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalStories,
//         hasNextPage: page < totalPages,
//         hasPrevPage: page > 1
//       }
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: "Error fetching stories by status", error: error.message });
//   }
// };

import { NextFunction, Request, Response } from 'express';
import { Story } from '../Models/storyModel';
//import { Chapter, IChapter } from '../Models/Chapter';
import { Summary } from '../Models/Summary';
import { AIService } from '../Services/aiService';
import { verifyTokenAndGetUser } from '../utils/verifyTokenAndGetUser';
import { AppError } from '../errors/appError';
//import { AuthenticatedRequest } from '../middleware/authMiddleware';
 

export const generateChapterController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId, summary, chapterNumber, totalChapters, wordsPerChapter, customizations = {} } = req.body;

    if (!chapterNumber || !totalChapters) {
      return res.status(400).json({
        success: false,
        message: "chapterNumber and totalChapters are required",
      });
    } 
 
    const token = req.cookies.jwt;
     
       if (!token) {
         return next(
           new AppError("You are not authorised to access this route", 401)
         );
       }
      
       const user = await verifyTokenAndGetUser(token, next);

    let story;

    // If storyId exists → find the story
    if (storyId) {
      story = await Story.findOne({ _id: storyId, user: user._id });
      if (!story) {
        return res.status(404).json({
          success: false,
          message: "Story not found",
        });
      }
    } else {
      // Must be first chapter to create new story
      if (chapterNumber !== 1) {
        return res.status(400).json({
          success: false,
          message: "You must start with Chapter 1 when creating a new story",
        });
      }

      if (!summary) {
        return res.status(400).json({
          success: false,
          message: "Summary is required when creating a new story",
        });
      }

      // Generate outline at creation
      const outline = await AIService.generateOutline(summary, totalChapters);

        if (!outline) {
        return res.status(400).json({
          success: false,
          message: "outline is required when creating a new story",
        });
      }

      console.log("The outline", outline)

      story = await Story.create({
        user: user._id,
        prompt: summary, // Using summary as prompt since prompt is required
        targetWords: wordsPerChapter * totalChapters, // Calculate total words
        totalChapters: totalChapters,
        summary,
        outline,
        chapters: [],
        status: "in_progress",
      });
    }

    // ✅ Enforce sequential generation
    if (chapterNumber > 1) {
      const previousChapterExists = story.chapters.some(ch => ch.number === chapterNumber - 1);
      if (!previousChapterExists) {
        return res.status(400).json({
          success: false,
          message: `You must generate Chapter ${chapterNumber - 1} before generating Chapter ${chapterNumber}.`,
        });
      }
    }

    // Prevent duplicates
    if (story.chapters.some(ch => ch.number === chapterNumber)) {
      return res.status(400).json({
        success: false,
        message: `Chapter ${chapterNumber} already exists.`,
      });
    }

    // Get outline item for this chapter
    const outlineItem = story?.outline[chapterNumber - 1];
    if (!outlineItem) {
      return res.status(400).json({
        success: false,
        message: `Outline for Chapter ${chapterNumber} not found.`,
      });
    }

    // Prepare previous chapters for continuity
    const previousChapters = story.chapters
      .sort((a, b) => a.number - b.number)
      .map(ch => ({
        number: ch.number,
        title: ch.title,
        content: ch.content
      }));

    // Generate chapter
    const chapter = await AIService.generateChapter(
      story.summary,
      chapterNumber,
      story.totalChapters,
      outlineItem?.description || `Chapter ${chapterNumber} storyline continuation`, // Pass the description string instead of the whole object
      { 
        previousChapters,
        wordsPerChapter, 
        ...customizations 
      }
    );
 
    console.log("The chapter is here", chapter)

    // Append chapter
    story.chapters.push({
      number: chapterNumber,
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.wordCount,
      paragraphs : chapter.paragraphs
    });

    // Mark completed if last chapter
    if (chapterNumber === story.totalChapters) {
      story.status = "completed";
    }

    await story.save();

    res.status(201).json({
      success: true,
      data: {
        storyId: story._id,
        chapter,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error generating chapter",
      error: error.message,
    });
  }
};


/**
 * Get all chapters for a script
 */
export const getFullStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check token
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find the story with chapters
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Pagination for chapters (optional)
    const skip = (Number(page) - 1) * Number(limit);
    const total = story.chapters.length;

    const paginatedChapters = story.chapters
      .sort((a, b) => a.number - b.number)
      .slice(skip, skip + Number(limit));

    res.status(200).json({
      success: true,
      data: {
        story: {
          _id: story._id,
          prompt: story.prompt,
          summary: story.summary,
          outline: story.outline,
          targetWords: story.targetWords,
          targetChapters: story.totalChapters,
          characterProfile: story.characterProfile,
          youtubeAssets: story.youtubeAssets,
          status: story.status,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          chapters: paginatedChapters,
        },
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching story",
      error: error.message,
    });
  }
};
 
/**
 * Get a story by ID
 */
export const getStoryUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;

    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story by ID & ownership
    const story = await Story.find({user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found for this particular user" ,
      });
    }

    console.log("All my story", story)

    res.status(200).json({
      success: true,
      data: story,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching story",
      error: error.message,
    });
  }
};

// /**
//  * Get script information
//  */
// export const getScript = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { summaryId } = req.params;

//     const token = req.cookies.jwt;
     
//        if (!token) {
//          return next(
//            new AppError("You are not authorised to access this route", 401)
//          );
//        }
     
//        const user = await verifyTokenAndGetUser(token, next);

//     const script = await Story.findOne({ summary: summaryId, user: user._id })
//       .populate('summary', 'title content hook conflict resolution');

//     if (!script) {
//       return res.status(404).json({
//         success: false,
//         message: 'Script not found'
//       });
//     }

//     // Get chapter count
//     const chapterCount = await Chapter.countDocuments({ script: script._id, user: user._id });

//     res.status(200).json({
//       success: true,
//       data: { 
//         script: {
//           ...script.toObject(),
//           chapterCount
//         }
//       }
//     });
//   } catch (error: any) {
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching script',
//       error: error.message
//     });
//   }
// };

/**
 * Update script settings
 */
export const updateScript = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { summaryId } = req.params;
    const { totalChapters, title } = req.body;
    const token = req.cookies.jwt;
     
       if (!token) {
         return next(
           new AppError("You are not authorised to access this route", 401)
         );
       }
     
       const user = await verifyTokenAndGetUser(token, next);

    const script = await Story.findOneAndUpdate(
      { summary: summaryId, user: user._id },
      { targetChapters: totalChapters, title },
      { new: true, runValidators: true }
    ).populate('summary', 'title content');

    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { script }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating script',
      error: error.message
    });
  }
};

