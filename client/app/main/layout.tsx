import Sidebar from "@/components/layouts/Sidebar";
import ProtectedLayout from "@/components/ProtectedLayout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <div className="flex min-h-screen bg-[url('/vector-home-bg-light.png')] dark:bg-[url('/vector-home-bg-dark.png')] bg-cover bg-center bg-no-repeat">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </ProtectedLayout>
  );
}