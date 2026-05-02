import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  component: () => (
    <RequireAuth redirect="/history">
      <History />
    </RequireAuth>
  ),
});

type Report = {
  id: string;
  symptoms: string;
  severity: "emergency" | "moderate" | "mild";
  advice: string;
  language: string;
  created_at: string;
};

function History() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("symptom_reports")
      .select("id, symptoms, severity, advice, language, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setReports((data ?? []) as Report[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const del = async (id: string) => {
    const { error } = await supabase.from("symptom_reports").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setReports((r) => r.filter((x) => x.id !== id));
  };

  const sevConfig = {
    emergency: { label: t("emergency", lang), icon: AlertTriangle, cls: "bg-emergency text-emergency-foreground" },
    moderate: { label: t("moderate", lang), icon: Clock, cls: "bg-moderate text-moderate-foreground" },
    mild: { label: t("mild", lang), icon: Sparkles, cls: "bg-mild text-mild-foreground" },
  };

  return (
    <MobileShell>
      <h2 className="mb-3 text-lg font-bold">{t("history", lang)}</h2>
      {loading ? (
        <p className="text-center text-sm text-muted-foreground">…</p>
      ) : reports.length === 0 ? (
        <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">{t("noReports", lang)}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => {
            const cfg = sevConfig[r.severity];
            const Icon = cfg.icon;
            return (
              <Card key={r.id} className="rounded-3xl border-2 p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${cfg.cls} shadow-sm`}>
                    <Icon className="h-4 w-4" /> {cfg.label}
                  </span>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={() => del(r.id)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <p className="line-clamp-2 text-base font-bold leading-tight">{r.symptoms}</p>
                  <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{r.advice}</p>
                  <p className="pt-2 text-xs font-medium text-muted-foreground/60 border-t">
                    {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </MobileShell>
  );
}
