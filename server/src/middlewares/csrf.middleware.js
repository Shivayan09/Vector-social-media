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

/**
 * CSRF Protection Middleware
 * 
 * Validates the `Origin` and `Referer` headers against an allowlist.
 * 
 * Security Fix: Uses the native `URL` module to parse and strictly compare 
 * origins. This prevents origin prefix spoofing attacks (e.g., bypassing 
 * validation by using a domain like `https://allowed-domain.com.malicious.net`).
 */
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

  const sourceString = origin || referer;
  const allowlist = getOriginAllowlist();

  const isAllowed = allowlist.some((allowed) => {
    if (!allowed) return false;
    try {
      const sourceUrl = new URL(sourceString);
      const allowedUrl = new URL(allowed);
      return sourceUrl.origin === allowedUrl.origin;
    } catch {
      return false;
    }
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
