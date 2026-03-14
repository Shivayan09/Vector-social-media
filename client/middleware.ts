import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("token")?.value;
    const pathname = request.nextUrl.pathname;
    const authRoutes = ["/auth/login", "/auth/register"];
    const publicRoutes = ["/"];
    const isAuthPage = authRoutes.some((route) => pathname.startsWith(route));
    const isPublicPage = publicRoutes.some((route) => pathname === route);
    if (!token && !isAuthPage && !isPublicPage) {
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (token && isAuthPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next|api|favicon.ico|images|.*\\.png$).*)"],
};