import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

import http from "http";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper function to generate content with resilient model fallback
  async function generateWithFallback(ai: GoogleGenAI, requestedModel: string, contents: any[], baseConfig: any) {
    // Deduplicated list of models to try in order of priority
    const candidates = [
      requestedModel,
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastError: any = null;
    for (const model of candidates) {
      try {
        const config = { ...baseConfig };
        // If tools like search grounding are enabled, only keep them for models that support it
        if (config.tools && model !== requestedModel && model !== 'gemini-3.8-flash') {
          delete config.tools;
        }

        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        const rawText = response.text || 
          response.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("\n") || 
          "";

        if (rawText.trim().length > 0) {
          return { text: rawText.trim(), modelUsed: model };
        }
      } catch (err: any) {
        console.warn(`Model ${model} attempt failed: ${err.message || err}. Trying next fallback candidate.`);
        lastError = err;
      }
    }

    throw lastError || new Error("All meteorological AI model candidates were unable to respond.");
  }

  // Chat API Route
  app.post("/api/chat", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { history, message, modelConfig } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ 
          error: "GEMINI_API_KEY is not configured in the environment. Please check your settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Default to gemini-3.8-flash for general tasks, allowing client to override
      const modelName = modelConfig?.model || "gemini-3.8-flash";

      // Transform history to SDK format, ensuring user starts first
      let contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        // Filter out decorative leading model messages so first turn is always user
        const validHistory = history.filter((m: any) => m && m.parts && m.parts[0]?.text);
        let firstUserIdx = validHistory.findIndex((m: any) => m.role === 'user');
        if (firstUserIdx !== -1) {
          contents = validHistory.slice(firstUserIdx);
        }
      }
      contents.push({ role: "user", parts: [{ text: message || "Hello" }] });

      const config: any = {
        systemInstruction: "You are an expert meteorologist and AI assistant embedded inside a Synoptic Weather Event Simulator. You have access to real-time search grounding to provide accurate and up-to-date meteorological data. Your purpose is to explain weather phenomena, analyze monsoon data, and discuss the simulator's output. Answer concisely and accurately.",
      };

      // Apply Google Search grounding if requested
      if (modelConfig?.useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const result = await generateWithFallback(ai, modelName, contents, config);
      return res.json({ text: result.text, modelUsed: result.modelUsed });
    } catch (error: any) {
      let msg = error.message || "Failed to generate response";
      if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
        msg = "The meteorological AI model is currently under high demand. Please try again in a few moments.";
      } else if (msg.includes("429") || msg.includes("quota")) {
        msg = "The AI rate limit has been temporarily reached. Please wait a moment before sending another message.";
      }
      console.error("Chat API error:", msg);
      return res.status(503).json({ error: msg });
    }
  });


  // Planner API Route
  app.post("/api/plan", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { location, occupation, modelConfig, weatherContext } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ 
          error: "GEMINI_API_KEY is not configured in the environment. Please check your settings." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const modelName = modelConfig?.model || "gemini-3.8-flash";
      const config: any = {
        systemInstruction: "You are an expert AI meteorological advisor. Based on the user's location and occupation, analyze likely upcoming weather patterns (specifically focusing on monsoon/heavy rain/extreme weather if applicable) and formulate a practical, actionable plan to help them prepare, stay safe, and minimize disruption to their work. Format your response cleanly using Markdown."
      };
      
      let promptText = `I live in ${location || 'Mumbai'} and my occupation is ${occupation || 'Farmer'}. Please predict future weather patterns and formulate an action plan for me.`;
      
      if (weatherContext) {
        promptText += `\n\nHere is the real-time 7-day weather forecast data for my location:\n${weatherContext}\n\nPlease base your predictions heavily on this live forecast data.`;
      }
      
      const contents = [{ role: "user", parts: [{ text: promptText }] }];
      
      const result = await generateWithFallback(ai, modelName, contents, config);
      return res.json({ text: result.text, modelUsed: result.modelUsed });
    } catch (error: any) {
      let msg = error.message || "Failed to generate plan";
      let friendlyMsg = msg;
      
      try {
        const errObj = JSON.parse(msg);
        if (errObj.error?.code === 429) {
          const retryInfo = errObj.error.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          const delay = retryInfo?.retryDelay || "1 minute";
          friendlyMsg = `The AI model rate limit has been reached. Please wait ${delay} and try again.`;
        } else if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
           friendlyMsg = "The meteorological AI model is currently experiencing high demand. Please try again in a few moments.";
        }
      } catch (e) {
        if (msg.includes("429") || msg.includes("quota")) {
           friendlyMsg = "The AI model rate limit has been reached. Please wait 1 minute and try again.";
        } else if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
           friendlyMsg = "The meteorological AI model is currently experiencing high demand. Please try again in a few moments.";
        }
      }
      
      console.error("Plan API error:", friendlyMsg);
      return res.status(503).json({ error: friendlyMsg });
    }
  });

  // Vite middleware for development

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server }
      },
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();