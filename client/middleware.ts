import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /main routes
  if (pathname.startsWith("/main")) {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    try {
      // Validate JWT signature and expiry
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      // Invalid or expired token
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to protected routes only
export const config = {
  matcher: ["/main/:path*"],
};