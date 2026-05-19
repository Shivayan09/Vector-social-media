import Review from "../models/review.model.js";

export const createReview = async (req, res) => {
  try {
    const { stars, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    const parsedStars = Number(stars);
    if (!parsedStars || parsedStars < 1 || parsedStars > 5) {
      return res.status(400).json({
        success: false,
        message: "Stars must be a number between 1 and 5",
      });
    }

    const review = await Review.create({
      author: userId,
      stars: parsedStars,
      comment: comment || "",
    });
    const populated = await review.populate("author", "username name avatar");
    res.status(201).json({ success: true, review: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username name avatar");
    const total = await Review.countDocuments();
    res.status(200).json({
      success: true,
      reviews,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAverage = async (req, res) => {
  try {
    const result = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
    ]);
    const payload = result[0] || { avg: 0, count: 0 };
    res.status(200).json({
      success: true,
      average: payload.avg || 0,
      count: payload.count || 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
