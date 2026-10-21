import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

app.get("/", (_req, res) => {
  res.json({ app: "JARVIS backend", status: "online", chatEndpoint: "/api/chat" });
});
app.get("/health", (_req, res) => res.json({ ok: true, configured: Boolean(GROQ_API_KEY) }));

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(503).json({ error: "Backend is online but GROQ_API_KEY is not configured." });
    }
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const lang = typeof req.body?.lang === "string" ? req.body.lang : "English (India)";
    if (!message) return res.status(400).json({ error: "Please provide a message." });
    if (message.length > 6000) return res.status(413).json({ error: "Message is too long (max 6000 characters)." });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are JARVIS, a helpful personal AI assistant. Be clear, practical, friendly, and concise. Reply in the user's language when possible. The selected voice language is ${lang}. Never claim you performed device actions unless the user or app actually did them.`
          },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 900
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || `Groq returned HTTP ${response.status}`;
      return res.status(response.status === 401 ? 502 : response.status).json({ error: detail });
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: "Groq returned an empty reply." });
    return res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Server error while contacting Groq. Check backend logs and network." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`JARVIS backend listening on port ${PORT}`);
});