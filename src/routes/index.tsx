import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stethoscope, MapPin, ScanLine, Bell, History, ShieldCheck, Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { lang } = useLanguage();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  const goCheck = () => {
    if (!user) nav({ to: "/auth", search: { redirect: "/check" } });
    else nav({ to: "/check" });
  };

  return (
    <MobileShell>
      {/* Hero */}
      <section className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Heart className="h-6 w-6" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{t("appName", lang)}</h1>
            <p className="text-xs text-muted-foreground">{t("tagline", lang)}</p>
          </div>
        </div>

        <Button
          onClick={goCheck}
          size="lg"
          className="mt-5 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
        >
          <Stethoscope className="mr-2 h-5 w-5" />
          {t("startCheck", lang)}
        </Button>

        {!loading && !user && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="font-medium text-trust underline-offset-2 hover:underline">
              {t("signIn", lang)}
            </Link>{" "}
            • {t("signUp", lang)}
          </p>
        )}
      </section>

      {/* Quick tiles */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <FeatureTile to="/nearby" icon={MapPin} label={t("nearby", lang)} accent="trust" />
        <FeatureTile to="/scan" icon={ScanLine} label={t("prescription", lang)} accent="primary" />
        <FeatureTile to="/alerts" icon={Bell} label={t("alerts", lang)} accent="moderate" />
        <FeatureTile to="/history" icon={History} label={t("history", lang)} accent="mild" />
      </section>

      {/* Disclaimer */}
      <Card className="mt-5 flex items-start gap-3 rounded-2xl border-trust/30 bg-trust/5 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-trust" />
        <p className="text-xs leading-relaxed text-muted-foreground">{t("disclaimer", lang)}</p>
      </Card>
    </MobileShell>
  );
}

function FeatureTile({
  to,
  icon: Icon,
  label,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: "primary" | "trust" | "moderate" | "mild";
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    trust: "bg-trust/10 text-trust",
    moderate: "bg-moderate/15 text-moderate-foreground",
    mild: "bg-mild/15 text-mild-foreground",
  } as const;
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${map[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-semibold leading-tight">{label}</span>
    </Link>
  );
}
