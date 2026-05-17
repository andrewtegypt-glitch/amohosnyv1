import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini SDK lazily to avoid crashing on missing key right away
  let ai: GoogleGenAI | null = null;
  const getAI = () => {
    if (!ai) {
      let rawKey = process.env.GEMINI_API_KEY || "";
      // Strip any accidental quotes or whitespace added in hosting platforms
      let apiKey = rawKey.replace(/^["']|["']$/g, '').trim();

      if (!apiKey || apiKey === "undefined" || apiKey === "null" || apiKey === "MY_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY is missing or invalid. Please configure your Gemini API Key in the AI Studio Secrets panel, or in your hosting provider's dashboard (e.g. Render, Vercel) if deployed.");
      }
      ai = new GoogleGenAI({ apiKey: apiKey });
    }
    return ai;
  };

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, persona, language } = req.body;
      const client = getAI();
      
      const refinedHistory = (history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Adjust persona instructions
      let personaInstruction = "";
      if (persona === "tourist") {
         personaInstruction = "The user is likely a tourist. Focus on giving them helpful travel advice, explaining history simply, translating basic phrases, and ensuring they feel welcomed to Egypt.";
      } else if (persona === "local") {
         personaInstruction = "The user is likely a local Egyptian. Use more street slang, culturally nuanced jokes, deeper local references, and respond like a true ibn balad / bint balad.";
      }

      // Adjust language instructions
      let languageInstruction = "IMPORTANT: You MUST write your responses primarily in English, sprinkling in Egyptian proverbs and slang (like 'ya basha', 'ya m3alem') sparingly.";
      if (language === 'ar') {
         languageInstruction = "IMPORTANT: You MUST write your responses entirely in Egyptian Arabic (العامية المصرية), using natural conversational phrasing, humor, and local slang.";
      }

      const finalSystemInstruction = `You are Hosny, a fun, practical, and incredibly helpful local AI assistant portal designed specifically for Egyptians. 
Your persona is a wise, slightly sarcastic, but deeply warm Egyptian uncle. You wrap your answers in local culture, everyday humor (Maskhara/Nokat), and history.
${languageInstruction}
${personaInstruction}
When users ask practical questions, give them accurate, helpful answers, but keep the Uncle Hosny flavor.
If asked about history, explain it with enthusiasm and a sense of pride, maybe comparing ancient times to modern daily struggles in Cairo.
CRITICAL: You MUST include real URLs as clickable markdown links (e.g. [Title](https://example.com)) to external content (like Wikipedia, local news, Google Maps, or relevant sites) when helpful. Always format links correctly so they can be clicked.
Keep responses engaging, visually easy to read (using markdown), and full of character.

Return your response strictly as a JSON object with two fields: 'reply' (your markdown text) and 'suggestions' (an array of exactly 3 relevant, short, snappy follow-up questions the user could ask next).`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            ...refinedHistory,
            // Insert System Instruction as the first message or use system_instruction param
            { role: 'user', parts: [{ text: message }] }
        ],
        config: {
            systemInstruction: finalSystemInstruction,
            responseMimeType: "application/json",
        }
      });
      
      // Parse JSON from Gemini because of the MimeType
      let responseData;
      try {
        responseData = JSON.parse(response.text || "{}");
      } catch (e) {
        // Fallback if not proper JSON
        responseData = { reply: response.text, suggestions: [] };
      }

      res.json({ 
         reply: responseData.reply || "Ma2lesh, say that again?", 
         suggestions: responseData.suggestions || [] 
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = error.message || "Something went wrong ya basha!";
      
      // Attempt to parse out Gemini specific errors to show better UI text
      if (errorMessage.includes("429") || errorMessage.includes("Quota")) {
         errorMessage = "Ah ya basha, we hit our limit with Google (429 Quota Exceeded). Since you added your billing details, give it a few minutes or verify your limits at the Google Cloud Console.";
      }

      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hosny is awake and serving tea on port ${PORT}`);
  });
}

startServer();
