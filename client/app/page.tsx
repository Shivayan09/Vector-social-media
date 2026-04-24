import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      redirect("/auth/login");
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/me`,
      {
        headers: {
          Cookie: `token=${token}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      redirect("/auth/login");
    }

    redirect("/main");
  } catch {
    redirect("/auth/login");
  }
}
