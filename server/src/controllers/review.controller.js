import Review from "../models/review.model.js";

export const createReview = async (req, res) => {
  try {
    const { stars, comment } = req.body;
    const author = req.user._id;

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: "Valid stars (1-5) are required" });
    }

    const review = new Review({
      author,
      stars,
      comment,
    });

    await review.save();
    
    // Populate author details before returning
    await review.populate("author", "username email");

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("author", "username email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAverage = async (req, res) => {
  try {
    const result = await Review.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: "$stars" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return res.status(200).json({ success: true, average: 0, count: 0 });
    }

    res.status(200).json({ success: true, average: result[0].average, count: result[0].count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};