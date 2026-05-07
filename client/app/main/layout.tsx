import Sidebar from "@/components/layouts/Sidebar";
import AuthGuard from "@/components/AuthGuard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
