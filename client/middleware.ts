import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes
  const protectedRoutes = ["/main"];

  // Check if current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check for authentication token (stored in cookies)
    const hasAuthToken = request.cookies.has("token") || 
                         request.cookies.has("authToken");

    if (!hasAuthToken) {
      // Redirect to login
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to protected routes only
export const config = {
  matcher: ["/main/:path*"],
};