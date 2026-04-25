import { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

export function MobileShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="min-h-screen bg-health-gradient">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background/40">
        <AppHeader />
        <main className="flex-1 px-4 py-4">{children}</main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
