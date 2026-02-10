import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/auth/login");
  }

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    redirect("/auth/login");
  }

  const { user } = await res.json();

  if (!user.isProfileComplete) {
    redirect("/auth/profile");
  }

  redirect("/main");
}
