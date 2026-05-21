const getOriginAllowlist = () => {
  const origins = [
    "http://localhost:3000",
    "http://vector-lac.vercel.app",
    "https://vector-lac.vercel.app",
  ];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  return origins;
};

const csrfProtection = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "CSRF validation failed: missing Origin header",
      });
    }
    return next();
  }

  const source = (origin || referer).replace(/\/+$/, "");
  const allowlist = getOriginAllowlist();

  const isAllowed = allowlist.some((allowed) => {
    if (!allowed) return false;
    return source.startsWith(allowed.replace(/\/+$/, ""));
  });

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: "CSRF validation failed: request origin is not allowed",
    });
  }

  next();
};

export default csrfProtection;
