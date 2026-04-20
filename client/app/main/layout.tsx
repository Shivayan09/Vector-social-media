import Sidebar from "@/components/layouts/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen neo-app-bg">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}