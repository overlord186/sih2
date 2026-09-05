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

  // Chat API Route
  app.post("/api/chat", async (req, res) => {
    try {
      const { history, message, modelConfig } = req.body;
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Default to 3.6 flash for general tasks, allowing client to override
      const modelName = modelConfig?.model || "gemini-3.6-flash";

      // Transform history to SDK format
      const contents = history ? [...history] : [];
      contents.push({ role: "user", parts: [{ text: message }] });

      const config: any = {
        systemInstruction: "You are an expert meteorologist and AI assistant embedded inside a Synoptic Weather Event Simulator. You have access to real-time search grounding to provide accurate and up-to-date meteorological data. Your purpose is to explain weather phenomena, analyze monsoon data, and discuss the simulator's output. Answer concisely and accurately.",
      };

      // Apply Google Search grounding if requested
      if (modelConfig?.useSearch) {
        // Search grounding removed to prevent 429 quota errors on free tier
        // config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      let msg = error.message || "Failed to generate response";
      if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("429") || msg.includes("quota")) {
        msg = "The model is currently experiencing high demand. Please wait a moment and try again.";
      }
      console.error("Chat API error:", msg); // Log only message, not full stack
      res.status(503).json({ error: msg });
    }
  });


  // Planner API Route
  app.post("/api/plan", async (req, res) => {
    try {
      const { location, occupation, modelConfig, weatherContext } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const modelName = modelConfig?.model || "gemini-3.6-flash";
      const config: any = {
        systemInstruction: "You are an expert AI meteorological advisor. Based on the user's location and occupation, analyze likely upcoming weather patterns (specifically focusing on monsoon/heavy rain/extreme weather if applicable) and formulate a practical, actionable plan to help them prepare, stay safe, and minimize disruption to their work. Format your response cleanly using Markdown."
      };
      
      let promptText = `I live in ${location} and my occupation is ${occupation}. Please predict future weather patterns and formulate an action plan for me.`;
      
      if (weatherContext) {
        promptText += `\n\nHere is the real-time 7-day weather forecast data for my location:\n${weatherContext}\n\nPlease base your predictions heavily on this live forecast data.`;
      }
      
      const contents = [{ role: "user", parts: [{ text: promptText }] }];
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });
      res.json({ text: response.text });
    } catch (error: any) {
      let msg = error.message || "Failed to generate plan";
      let friendlyMsg = msg;
      
      try {
        const errObj = JSON.parse(msg);
        if (errObj.error?.code === 429) {
          const retryInfo = errObj.error.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
          const delay = retryInfo?.retryDelay || "1 minute";
          friendlyMsg = `The AI model rate limit (15 requests/minute) has been reached to prevent spam. Please wait ${delay} and try again.`;
        } else if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
           friendlyMsg = "The model is currently experiencing high demand. Please wait a moment and try again.";
        }
      } catch (e) {
        if (msg.includes("429") || msg.includes("quota")) {
           friendlyMsg = "The AI model rate limit has been reached to prevent spam. Please wait 1 minute and try again.";
        }
      }
      
      console.error("Plan API error:", friendlyMsg);
      res.status(503).json({ error: friendlyMsg });
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