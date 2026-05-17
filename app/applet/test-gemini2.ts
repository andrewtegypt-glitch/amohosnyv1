import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function main() {
  const fakeKey = "AIzaSyB-fake-fake-fake-fake-fake";
  
  console.log("Key length:", fakeKey.length);
  
  const ai = new GoogleGenAI({ apiKey: fakeKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello"
    });
    console.log("Success!", response.text);
  } catch (e: any) {
    console.log("Error:", e.message);
    console.log("Full error data:", e);
  }
}

main();
