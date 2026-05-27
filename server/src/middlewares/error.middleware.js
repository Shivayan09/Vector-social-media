const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  if (process.env.NODE_ENV === "production") {
    return res.status(status).json({ success: false, message });
  }
  return res.status(status).json({ success: false, message, stack: err.stack });
};

export default errorHandler;
