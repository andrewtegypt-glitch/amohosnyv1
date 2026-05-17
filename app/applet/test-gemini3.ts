import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  
  console.log("Key length:", apiKey.length);
  
  const ai = new GoogleGenAI({ apiKey: apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "hello"
    });
    console.log("Success!", response.text);
  } catch (e: any) {
    console.log("Error:", e.message);
    console.log("Full error data:", JSON.stringify(e));
  }
}

main();
