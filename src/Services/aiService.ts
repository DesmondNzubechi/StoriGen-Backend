import fetch from "node-fetch";
import OpenAI from "openai";

const useOpenAI = process.env.USE_OPENAI === "true";

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateScript(topic: string, tone: string, length: string): Promise<string> {
  const prompt = `Write a ${length} storytelling script in a ${tone} tone about: ${topic}`;

  if (useOpenAI) {
    // ---- OpenAI branch ----
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional scriptwriter." },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0].message?.content || "No response from OpenAI.";
  } else {
    // ---- Ollama branch ----
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt,
        stream: false
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.response || "No response from Ollama.";
  }
}
