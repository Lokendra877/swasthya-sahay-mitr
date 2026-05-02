// Edge function: AI symptom triage (non-streaming for simplicity & robustness)
// Uses Lovable AI Gateway with structured tool-calling output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Msg = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language } = (await req.json()) as {
      messages: Msg[];
      language?: "en" | "hi";
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const lang = language === "hi" ? "Hindi" : "English";

    const system = `You are SwasthAI, a careful medical TRIAGE assistant for the general public, including rural and low-literacy users in India.
Reply ONLY in ${lang}. Use simple, kind, short sentences. Avoid medical jargon.

Your job:
1. Ask 1-2 short follow-up questions if symptoms are unclear (one at a time).
2. When you have enough info (typically after 1-3 turns), call the "triage_decision" tool with severity and advice.
3. NEVER give diagnoses or specific drug prescriptions. Focus on safety & next steps.
4. If life-threatening signs appear (chest pain, trouble breathing, stroke signs, heavy bleeding, unconsciousness, severe injury), classify as "emergency" immediately.

Severity rules:
- emergency: life-threatening or rapidly worsening — go to hospital now
- moderate: needs a doctor within 24 hours
- mild: home care is enough (rest, fluids, monitor)

Always remind the user this is not a replacement for a doctor.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "triage_decision",
          description:
            "Provide the final triage classification when enough info is gathered.",
          parameters: {
            type: "object",
            properties: {
              severity: {
                type: "string",
                enum: ["emergency", "moderate", "mild"],
              },
              summary: {
                type: "string",
                description: "Short summary of reported symptoms.",
              },
              advice: {
                type: "string",
                description:
                  "Plain-language next steps. 2-4 short sentences. Include the disclaimer.",
              },
              red_flags: {
                type: "array",
                items: { type: "string" },
                description: "Warning signs to watch for that mean go to hospital.",
              },
            },
            required: ["severity", "summary", "advice"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: system }, ...messages],
          tools,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway failed");
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;
    const toolCall = choice?.tool_calls?.[0];

    let triage: any = null;
    let assistantText: string = choice?.content ?? "";

    if (toolCall?.function?.name === "triage_decision") {
      try {
        triage = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool args", e);
      }
    }

    return new Response(
      JSON.stringify({ assistant: assistantText, triage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("triage error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
