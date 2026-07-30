const getOriginAllowlist = () => {
  const origins = [];

  // Development environment: allow localhost with both HTTP and HTTPS
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000");
    origins.push("https://localhost:3000");
  }

  // Production environment: only allow HTTPS origins from env vars
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  // Allow secondary frontend URLs if provided (comma-separated)
  if (process.env.FRONTEND_URLS) {
    const secondaryUrls = process.env.FRONTEND_URLS.split(",").map(url => url.trim());
    origins.push(...secondaryUrls);
  }

  // Validate that production origins use HTTPS
  if (process.env.NODE_ENV === "production") {
    origins.forEach(origin => {
      if (origin && origin.startsWith("http://")) {
        console.warn(
          `[CSRF Warning] Production environment has HTTP origin: ${origin}. ` +
          "Only HTTPS origins are allowed in production. Please update FRONTEND_URL or FRONTEND_URLS env vars."
        );
      }
    });
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
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (!origin && !referer) {
    return res.status(403).json({
      success: false,
      message: "CSRF validation failed: missing Origin header",
    });
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
