import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const API_KEY = Deno.env.get("LOVABLE_API_KEY") || "AIzaSyAsxKe41KyM2y-vj8N85zdhg5kLLFgYJ20";
    
    if (!API_KEY) {
      throw new Error("API Key is not configured");
    }

    const systemPrompt = `You are a helpful AI health assistant for a hospital management system. 
    Guidelines:
    - Never diagnose conditions - always recommend professional medical consultation.
    - Be empathetic and supportive.
    - For emergencies, always advise calling emergency services immediately.
    - Keep responses concise but informative.`;

    // Map OpenAI messages to Gemini contents
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    // Prepend system instructions to the first message for maximum compatibility
    if (contents.length > 0 && contents[0].role === "user") {
      contents[0].parts[0].text = `Instructions: ${systemPrompt}\n\nUser Message: ${contents[0].parts[0].text}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: contents,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, data);
      const errorMessage = data.error?.message || data.error?.status || "Unknown AI error";
      return new Response(JSON.stringify({ error: `Gemini Error (${response.status}): ${errorMessage}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
    
    // Return in a format that the streaming-aware frontend can handle
    const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
    
    return new Response(sseData, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Health assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
