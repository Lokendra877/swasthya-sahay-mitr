import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Sparkles, Save, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { speak } from "@/hooks/useSpeech";

export const Route = createFileRoute("/scan")({
  component: () => (
    <RequireAuth redirect="/scan">
      <Scan />
    </RequireAuth>
  ),
});

function Scan() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFile = (f: File) => {
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setExplanation(null);
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("scan-prescription", {
          body: { imageBase64: dataUrl, language: lang },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setExplanation(data.explanation ?? "");
      } catch (e: any) {
        toast.error(e.message ?? "Could not read prescription");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(f);
  };

  const save = async () => {
    if (!explanation || !user) return;
    const { error } = await supabase.from("prescription_scans").insert({
      user_id: user.id,
      extracted_text: explanation.slice(0, 4000),
      simplified_explanation: explanation,
      language: lang,
    });
    if (error) toast.error(error.message);
    else toast.success(lang === "hi" ? "सहेज लिया" : "Saved");
  };

  return (
    <MobileShell>
      <h2 className="mb-3 text-lg font-bold">{t("prescription", lang)}</h2>

      <Card className="rounded-2xl p-4">
        {preview ? (
          <img src={preview} alt="prescription" className="max-h-60 w-full rounded-xl object-contain" />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground">
            <Sparkles className="mb-2 h-6 w-6 text-primary" />
            <p className="px-4 text-center text-xs">
              {lang === "hi"
                ? "नुस्खा की फोटो अपलोड करें या खींचें — AI सरल भाषा में समझाएगा।"
                : "Upload or capture a prescription. AI will explain it in simple language."}
            </p>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button variant="secondary" className="h-12 rounded-xl" onClick={() => camRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            {lang === "hi" ? "कैमरा" : "Camera"}
          </Button>
          <Button className="h-12 rounded-xl" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {t("uploadImage", lang)}
          </Button>
        </div>
      </Card>

      {loading && (
        <Card className="mt-3 flex items-center gap-2 rounded-2xl p-4 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse text-primary" />
          {t("scanning", lang)}
        </Card>
      )}

      {explanation && (
        <Card className="mt-3 rounded-2xl border-trust/30 bg-trust/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-trust">
              {lang === "hi" ? "AI व्याख्या" : "AI Explanation"}
            </p>
            <button
              onClick={() => speak(explanation, lang)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Listen"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{explanation}</p>
          <Button onClick={save} variant="secondary" className="mt-3 w-full rounded-xl">
            <Save className="mr-2 h-4 w-4" /> {t("saveReport", lang)}
          </Button>
        </Card>
      )}

      <p className="mt-3 text-center text-[10px] text-muted-foreground">{t("disclaimer", lang)}</p>
    </MobileShell>
  );
}
