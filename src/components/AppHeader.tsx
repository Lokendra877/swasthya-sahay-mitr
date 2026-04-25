import { Link } from "@tanstack/react-router";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Heart, LogOut } from "lucide-react";

export function AppHeader() {
  const { lang, setLang } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Heart className="h-4 w-4" fill="currentColor" />
          </div>
          <span className="text-base font-bold tracking-tight">{t("appName", lang)}</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-accent"
            aria-label="Toggle language"
          >
            {lang === "en" ? "हिं" : "EN"}
          </button>
          {user && (
            <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("signOut", lang)}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
