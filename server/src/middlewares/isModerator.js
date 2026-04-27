const isModerator = (req, res, next) => {
  const role = req.user?.role;

  if (role === "admin" || role === "moderator") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden. Moderator access required.",
  });
};

export default isModerator;
