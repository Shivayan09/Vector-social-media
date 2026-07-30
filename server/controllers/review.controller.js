import mongoose from "mongoose";
import Review from "../models/review.model.js";
import asyncHandler from "../utils/asyncHandler.js";
const MAX_LIMIT = 50;

export const createReview = asyncHandler(async (req, res) => {
  let { stars, comment, target } = req.body;

    if (!stars || !Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: "Stars must be an integer between 1 and 5",
      });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment must be 1000 characters or less",
      });
    }

    if (target && !mongoose.Types.ObjectId.isValid(target)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target ID format",
      });
    }

    const existing = await Review.findOne({
      author: req.user.id,
      target: target || null,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a review",
      });
    }

    const review = await Review.create({
      author: req.user.id,
      target: target || null,
      stars,
      comment: comment || "",
    });

    const populated = await review.populate("author", "username name avatar");

    res.status(201).json({
      success: true,
      review: populated,
    });
});

export const getReviews = asyncHandler(async (req, res) => {
    const cursor = req.query.cursor;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), MAX_LIMIT);
    const target = req.query.target;

    let filter = {};

    if (target) {
      if (!mongoose.Types.ObjectId.isValid(target)) {
        return res.status(400).json({
          success: false,
          message: "Invalid target ID format",
        });
      }
      filter.target = target;
    }

    if (cursor) {
      if (mongoose.Types.ObjectId.isValid(cursor)) {
        filter._id = { $lt: cursor };
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid cursor format",
        });
      }
    }

    const reviews = await Review.find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .populate("author", "username name avatar");

    const hasMore = reviews.length === limit;
    const nextCursor = hasMore ? reviews[reviews.length - 1]._id : null;

    res.status(200).json({
      success: true,
      reviews,
      hasMore,
      nextCursor,
      limit,
    });

});

export const getAverage = asyncHandler(async (req, res) => {
  const { target } = req.query;

    let match = {};
    if (target) {
      if (!mongoose.Types.ObjectId.isValid(target)) {
        return res.status(400).json({
          success: false,
          message: "Invalid target ID format",
        });
      }
      match.target = target;
    }

    const result = await Review.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          averageStars: { $avg: "$stars" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const stats = result[0] || { averageStars: 0, totalReviews: 0 };

    res.status(200).json({
      success: true,
      average: Math.round(stats.averageStars * 10) / 10,
      count: stats.totalReviews,
    });
});