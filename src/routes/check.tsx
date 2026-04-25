import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition, speak, stopSpeaking } from "@/hooks/useSpeech";
import { Mic, Send, Square, AlertTriangle, Clock, Sparkles, Save, RefreshCw, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/check")({
  component: () => (
    <RequireAuth redirect="/check">
      <SymptomCheck />
    </RequireAuth>
  ),
});

type Msg = { role: "user" | "assistant"; content: string };
type Triage = {
  severity: "emergency" | "moderate" | "mild";
  summary: string;
  advice: string;
  red_flags?: string[];
};

function SymptomCheck() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState<Triage | null>(null);
  const speech = useSpeechRecognition(lang);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greet =
        lang === "hi"
          ? "नमस्ते! मुझे बताइए — आपको क्या तकलीफ़ है?"
          : "Hello! Please tell me — what symptoms are you feeling?";
      setMessages([{ role: "assistant", content: greet }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, triage, loading]);

  // Sync voice transcript into input
  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    stopSpeaking();
    const newMsgs = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(newMsgs);
    setInput("");
    speech.setTranscript("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("triage", {
        body: { messages: newMsgs, language: lang },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.triage) {
        setTriage(data.triage as Triage);
        const closing =
          lang === "hi"
            ? "मेरा सुझाव नीचे देखें।"
            : "Here is my recommendation below.";
        setMessages((m) => [...m, { role: "assistant", content: closing }]);
        speak(`${(data.triage as Triage).advice}`, lang);
      } else if (data.assistant) {
        setMessages((m) => [...m, { role: "assistant", content: data.assistant }]);
        speak(data.assistant, lang);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Could not reach the AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    stopSpeaking();
    setMessages([]);
    setTriage(null);
    setInput("");
  };

  const save = async () => {
    if (!triage || !user) return;
    const symptoms = messages.filter((m) => m.role === "user").map((m) => m.content).join(" | ");
    const { error } = await supabase.from("symptom_reports").insert({
      user_id: user.id,
      symptoms,
      severity: triage.severity,
      advice: triage.advice,
      conversation: messages,
      language: lang,
    });
    if (error) toast.error(error.message);
    else toast.success(lang === "hi" ? "रिपोर्ट सहेज ली गई" : "Report saved");
  };

  return (
    <MobileShell>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("symptomChecker", lang)}</h2>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RefreshCw className="mr-1 h-4 w-4" />
          {t("newCheck", lang)}
        </Button>
      </div>

      <Card className="flex h-[55vh] flex-col rounded-2xl border bg-card p-3 shadow-sm">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} lang={lang} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 animate-pulse" />
              {lang === "hi" ? "सोच रहा हूँ…" : "Thinking…"}
            </div>
          )}
          {triage && <TriageCard triage={triage} lang={lang} onSave={save} />}
        </div>
      </Card>

      {/* Input */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant={speech.listening ? "destructive" : "secondary"}
          className="h-12 w-12 shrink-0 rounded-2xl"
          onClick={() => (speech.listening ? speech.stop() : speech.start())}
          disabled={!speech.supported}
          aria-label={t("speak", lang)}
        >
          {speech.listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={speech.listening ? t("listening", lang) : t("describe", lang)}
          className="h-12 flex-1 rounded-2xl text-base"
        />
        <Button
          type="button"
          size="icon"
          className="h-12 w-12 shrink-0 rounded-2xl"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          aria-label={t("send", lang)}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("disclaimer", lang)}</p>
    </MobileShell>
  );
}

function Bubble({ msg, lang }: { msg: Msg; lang: "en" | "hi" }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-secondary text-secondary-foreground"
        )}
      >
        {msg.content}
        {!isUser && (
          <button
            onClick={() => speak(msg.content, lang)}
            className="ml-2 inline-flex align-middle text-muted-foreground hover:text-foreground"
            aria-label="Listen"
          >
            <Volume2 className="inline h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function TriageCard({
  triage,
  lang,
  onSave,
}: {
  triage: Triage;
  lang: "en" | "hi";
  onSave: () => void;
}) {
  const cfg = {
    emergency: {
      bg: "bg-emergency text-emergency-foreground",
      ring: "ring-emergency",
      icon: AlertTriangle,
      label: t("emergency", lang),
      emoji: "🔴",
    },
    moderate: {
      bg: "bg-moderate text-moderate-foreground",
      ring: "ring-moderate",
      icon: Clock,
      label: t("moderate", lang),
      emoji: "🟠",
    },
    mild: {
      bg: "bg-mild text-mild-foreground",
      ring: "ring-mild",
      icon: Sparkles,
      label: t("mild", lang),
      emoji: "🟢",
    },
  }[triage.severity];

  const Icon = cfg.icon;

  return (
    <div className={cn("mt-3 rounded-2xl border-2 p-4 ring-2 ring-offset-2", cfg.ring)}>
      <div className={cn("mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold", cfg.bg)}>
        <Icon className="h-4 w-4" /> {cfg.emoji} {cfg.label}
      </div>
      <p className="text-sm font-semibold leading-relaxed">{triage.summary}</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{triage.advice}</p>
      {triage.red_flags && triage.red_flags.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-muted/60 p-3 text-xs">
          {triage.red_flags.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-emergency" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <Button onClick={onSave} variant="secondary" className="flex-1 rounded-xl">
          <Save className="mr-2 h-4 w-4" /> {t("saveReport", lang)}
        </Button>
      </div>
    </div>
  );
}
