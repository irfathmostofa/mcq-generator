import { Outlet } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";

export function PublicLayout() {
  return (
    <div className="min-h-screen min-w-0 bg-background">
      <header className="sticky top-0 z-20 truncate border-b bg-background/95 px-4 py-3 text-sm font-medium backdrop-blur">
        {APP_NAME}
      </header>
      <main className="mx-auto w-full min-w-0 max-w-3xl p-3 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
