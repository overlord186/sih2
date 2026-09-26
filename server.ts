import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";

import { GoogleGenAI } from "@google/genai";
import { generateMeteorologicalResponse, generateMeteorologicalPlan } from "./src/utils/meteorologicalChatEngine";

import http from "http";

process.on('uncaughtException', (err) => {
  console.error('Server uncaughtException safely handled:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Server unhandledRejection safely handled:', reason);
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper sleep function for backoff
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Helper sanitizer to strip out any API key values or key query params from log output
  const sanitizeLog = (str: string): string => {
    if (!str) return '';
    let sanitized = String(str);
    if (process.env.GEMINI_API_KEY) {
      sanitized = sanitized.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED_API_KEY]');
    }
    return sanitized.replace(/key=[A-Za-z0-9_\-]+/g, 'key=[REDACTED]');
  };

  // Domain fallback engine when Google upstream API experiences temporary high demand or no key
  function generateMeteorologicalFallback(contents: any[], baseConfig: any, promptType: 'chat' | 'plan', extraContext?: any): string {
    const lastUserText = Array.isArray(contents) && contents.length > 0 
      ? contents[contents.length - 1]?.parts?.[0]?.text || "" 
      : "";

    if (promptType === 'plan') {
      const loc = extraContext?.location || 'Nagpur (Sonegaon)';
      const occ = extraContext?.occupation || 'Farmer & Agricultural Producer';
      const rawWeather = extraContext?.weatherContext;
      return generateMeteorologicalPlan(loc, occ, rawWeather);
    }

    return generateMeteorologicalResponse(lastUserText);
  }

  // In-memory LRU query cache to prevent redundant API calls & rate limit exhaustion
  const queryCache = new Map<string, { text: string; modelUsed: string; timestamp: number }>();
  const CACHE_TTL_MS = 60 * 1000; // 60 seconds
  const MAX_CACHE_SIZE = 200;

  const setCacheItem = (key: string, val: { text: string; modelUsed: string; timestamp: number }) => {
    if (queryCache.size >= MAX_CACHE_SIZE) {
      const oldest = queryCache.keys().next().value;
      if (oldest) queryCache.delete(oldest);
    }
    queryCache.set(key, val);
  };

  // Helper function to generate content with resilient model fallback
  async function generateWithFallback(ai: GoogleGenAI, requestedModel: string, contents: any[], baseConfig: any, promptType: 'chat' | 'plan' = 'chat', extraContext?: any) {
    const cacheKey = `${promptType}:${JSON.stringify(contents)}:${Boolean(baseConfig.tools?.length)}`;
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return { text: cached.text, modelUsed: cached.modelUsed, isLive: true };
    }

    // Map any legacy/invalid model requests to active production endpoints
    const mappedModel = requestedModel
      .replace('gemini-3.7-flash', 'gemini-2.5-flash')
      .replace('gemini-3.1-pro-preview', 'gemini-2.5-pro')
      .replace('gemini-3.1-flash-lite', 'gemini-2.0-flash');

    // Deduplicated list of standard production models with high availability
    const candidates = [
      mappedModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-pro',
      'gemini-2.0-flash-lite',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    for (const model of candidates) {
      const attempts = [
        { useTools: Boolean(baseConfig.tools && (model === requestedModel || model === 'gemini-2.5-flash' || model === 'gemini-2.5-pro')), delayMs: 0 },
        { useTools: false, delayMs: 50 },
      ];

      if (!baseConfig.tools) {
        attempts.length = 1;
      }

      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        if (attempt.delayMs > 0) {
          await sleep(attempt.delayMs);
        }

        try {
          const config = { ...baseConfig };
          if (!attempt.useTools && config.tools) {
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
            const resData = { text: rawText.trim(), modelUsed: model, isLive: true };
            setCacheItem(cacheKey, { ...resData, timestamp: Date.now() });
            return resData;
          }
        } catch (err: any) {
          const rawErr = String(err?.message || JSON.stringify(err) || '');
          const errStr = sanitizeLog(rawErr);
          console.warn(`Model ${model} attempt notice: ${errStr}`);

          // If model is not available or not found on this project tier, try next candidate model
          if (errStr.includes("NOT_FOUND") || errStr.includes("404")) {
            console.log(`Model ${model} not available on this endpoint/key, trying next candidate model...`);
            break;
          }

          // For rate limits or quota, return synoptic intelligence fallback smoothly
          const isRateOrQuota = 
            errStr.includes("429") || 
            errStr.includes("RESOURCE_EXHAUSTED") || 
            errStr.includes("Quota") || 
            errStr.includes("quota") || 
            errStr.includes("Rate exceeded") || 
            errStr.includes("rate limit") ||
            errStr.includes("Too Many Requests") ||
            errStr.includes("exceeded");

          if (isRateOrQuota) {
            console.warn("Upstream model rate/quota limit reached. Seamlessly utilizing built-in synoptic intelligence.");
            const fallbackResponse = generateMeteorologicalFallback(contents, baseConfig, promptType, extraContext);
            const resData = { text: fallbackResponse, modelUsed: 'samvartka-synoptic-core', isLive: false };
            setCacheItem(cacheKey, { ...resData, timestamp: Date.now() });
            return resData;
          }
        }
      }
    }

    // If all models encounter exceptions or timeouts, activate zero-downtime synoptic engine
    console.warn("Activating resilient synoptic meteorological intelligence engine.");
    const fallbackResponse = generateMeteorologicalFallback(contents, baseConfig, promptType, extraContext);
    const resData = { text: fallbackResponse, modelUsed: 'samvartka-synoptic-core', isLive: false };
    setCacheItem(cacheKey, { ...resData, timestamp: Date.now() });
    return resData;
  }

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Chat API Route
  app.post("/api/chat", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    let contents: any[] = [];
    try {
      const { history, message, modelConfig, apiKey: clientApiKey } = req.body || {};
      
      if (Array.isArray(history) && history.length > 0) {
        // Filter out decorative leading model messages so first turn is always user
        const validHistory = history.filter((m: any) => m && m.parts && m.parts[0]?.text);
        let firstUserIdx = validHistory.findIndex((m: any) => m.role === 'user');
        if (firstUserIdx !== -1) {
          contents = validHistory.slice(firstUserIdx);
        }
      }
      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents.pop();
      }
      contents.push({ role: "user", parts: [{ text: message || "Hello" }] });

      const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
      const apiKey = clientApiKey || headerKey || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

      if (!apiKey || apiKey.trim() === '' || apiKey.trim().length < 15 || apiKey.trim().startsWith('TODO')) {
        const fallbackText = generateMeteorologicalFallback(contents, { tools: [] }, 'chat');
        return res.json({ text: fallbackText, modelUsed: 'samvartka-synoptic-core', isLive: false });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Default to gemini-2.0-flash or gemini-2.5-flash for high responsiveness
      const modelName = modelConfig?.model || "gemini-2.0-flash";

      const config: any = {
        systemInstruction: "You are an expert meteorologist and AI advisor embedded inside the SAMVARTAKA Monsoon Rainfall Post-Processor. You have comprehensive understanding of tropical meteorology, the Indian Summer Monsoon, synoptic regimes (Active, Break, Normal, Post-Monsoon), Numerical Weather Prediction (ECMWF, GFS, NCUM), bias correction using Quantile Regression Forests (QRF), Doppler radar, and hydrological flood risk. Answer clearly, accurately, and authoritatively using Markdown.",
      };

      // Apply Google Search grounding if requested
      if (modelConfig?.useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      const result = await generateWithFallback(ai, modelName, contents, config, 'chat');
      return res.json({ text: result.text, modelUsed: result.modelUsed, isLive: result.isLive });
    } catch (error: any) {
      console.warn("Chat API error caught, utilizing synoptic fallback:", sanitizeLog(error?.message || error));
      const fallbackText = generateMeteorologicalFallback(contents, { tools: [] }, 'chat');
      return res.json({ text: fallbackText, modelUsed: 'samvartka-synoptic-core', isLive: false });
    }
  });

  // Planner API Route
  app.post("/api/plan", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { location, occupation, modelConfig, weatherContext, apiKey: clientApiKey } = req.body || {};
      
      const headerKey = req.headers['x-gemini-api-key'] as string | undefined;
      const apiKey = clientApiKey || headerKey || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

      if (!apiKey || apiKey.trim() === '' || apiKey.trim().length < 15 || apiKey.trim().startsWith('TODO')) {
        const fallbackText = generateMeteorologicalFallback([{ role: 'user', parts: [{ text: `Plan for ${location} as ${occupation}` }] }], { tools: [] }, 'plan', { location, occupation, weatherContext });
        return res.json({ text: fallbackText, modelUsed: 'samvartka-synoptic-core', isLive: false });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const modelName = modelConfig?.model || "gemini-2.5-flash";
      const config: any = {
        systemInstruction: "You are an elite research meteorologist and operational disaster resilience advisor embedded inside SAMVARTAKA (India Monsoon Rainfall Post-Processor). Formulate a crisp, highly structured, authoritative, and sector-tailored Synoptic Action & Resilience Plan. Format your output strictly in professional GitHub Markdown with these exact sections:\n\n### 🌦️ Synoptic Action & Resilience Plan: [Location]\n**Target Sector:** [Occupation]  \n**Meteorological Engine:** SAMVARTAKA Synoptic Intelligence (Active Live AI)  \n**IMD Alert Classification:** [🟢 Green / 🟡 Yellow / 🟠 Orange / 🔴 Red Alert with exact quantitative mm/24h threshold]\n\n---\n\n#### 1. 🛰️ Synoptic Risk Profile & Agro-Ecological State\n- Atmospheric regime classification, moisture convergence, low-level jet velocity, and local topographic dynamics.\n- Numerical weather telemetry synthesis: 7-day expected precipitation total (mm), peak rain date and single-day max rain (mm), rain probability %, and peak wind gusts.\n\n#### 2. 🎯 Sector Hazard Matrix & Asset Impact ([Occupation])\n- Specific operational vulnerabilities (e.g. for Farmers: specific crops like Cotton, Soybean, Pulses, Oranges, Vertisol/black-cotton soil drainage, fertilizer/pesticide wash-off; for Construction: crane wind limit, trench slumping; for Logistics: highway choke points, container sealing).\n\n#### 3. ⏱️ Phased Tactical Action Protocol\n- T-48h to T-24h (Readiness Phase): Concrete preventative actions.\n- T-12h to T-0h (Active Storm Event): Operational stoppage triggers and live protection.\n- Post-Event (Recovery & Assessment): Field drainage, structural checks, crop/asset revival.\n\n#### 4. 🛡️ Critical Go / No-Go Decision Matrix\n- Explicit quantitative threshold triggers (e.g. wind speed cutoff, rainfall intensity mm/hr, standing water limits).\n\n#### 5. ✅ Immediate Tactical Readiness Checklist\n- Actionable checkboxes [ ] for rapid operational sign-off."
      };
      
      let promptText = `Generate a crisp, operational, sector-tailored Synoptic Action & Resilience Plan for location: "${location || 'Nagpur (Sonegaon)'}", target sector: "${occupation || 'Farmer & Agricultural Producer'}".`;
      
      if (weatherContext) {
        const weatherStr = typeof weatherContext === 'string' ? weatherContext : JSON.stringify(weatherContext);
        promptText += `\n\nReal-time 7-day numerical weather telemetry:\n${weatherStr}\n\nBase your quantitative risk assessment directly on this forecast data.`;
      }
      
      const contents = [{ role: "user", parts: [{ text: promptText }] }];
      
      const result = await generateWithFallback(ai, modelName, contents, config, 'plan', { location, occupation, weatherContext });
      return res.json({ text: result.text, modelUsed: result.modelUsed, isLive: result.isLive });
    } catch (error: any) {
      console.warn("Plan API error caught, utilizing synoptic fallback:", sanitizeLog(error?.message || error));
      const { location, occupation, weatherContext } = req.body || {};
      const fallbackText = generateMeteorologicalFallback([{ role: 'user', parts: [{ text: `Plan for ${location} as ${occupation}` }] }], { tools: [] }, 'plan', { location, occupation, weatherContext });
      return res.json({ text: fallbackText, modelUsed: 'samvartka-synoptic-core', isLive: false });
    }
  });

  // Favicon handler to avoid 404 falling through or causing redirect loops
  app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
  });

  // Standard Vite Middleware in dev, Static serving in production
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.argv.includes("--production") ||
    process.env.npm_lifecycle_event === "start" ||
    (typeof __filename !== "undefined" && __filename.endsWith(".cjs"));

  if (!isProduction) {
    console.log("Mounting Vite development middleware...");
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: server,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Explicit fallback for SPA routes in dev mode
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const rootIndexPath = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(rootIndexPath)) {
          let template = fs.readFileSync(rootIndexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).end(template);
        }
        next();
      } catch (e: any) {
        if (vite.ssrFixStacktrace) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.includes('/assets/') || filePath.includes('\\assets\\')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Express Error Interceptor
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.warn("Global Express error caught in server.ts:", err?.message || err);
    if (res.headersSent) {
      return next(err);
    }
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      const distPath = path.join(process.cwd(), "dist");
      const indexPath = fs.existsSync(path.join(distPath, "index.html"))
        ? path.join(distPath, "index.html")
        : path.join(process.cwd(), "index.html");
      if (fs.existsSync(indexPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).sendFile(indexPath);
      }
    }
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ status: "ok", text: "Atmospheric synoptic post-processing services active." });
  });

  // Helper to safely bind an HTTP server to both IPv4 (0.0.0.0) and IPv6 (::)
  const bindDualStack = (srv: http.Server, port: number, label: string) => {
    srv.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[${label}] Port ${port} is occupied; continuing gracefully.`);
      } else {
        console.error(`[${label}] Server error:`, err?.message || err);
      }
    });

    // Explicitly bind 0.0.0.0 to guarantee 127.0.0.1, localhost (IPv4), and LAN IP connectivity on Windows
    srv.listen(port, '0.0.0.0', () => {
      console.log(`[${label}] Server active on:`);
      console.log(`  > Local:     http://localhost:${port}`);
      console.log(`  > Loopback:  http://127.0.0.1:${port}`);
    });

    // Also attempt IPv6 binding on '::' for dual-stack Windows environments
    try {
      const ipv6Srv = http.createServer(app);
      ipv6Srv.on('error', () => {
        // Silently ignore if port is handled by dual-stack or unavailable
      });
      ipv6Srv.on('upgrade', (req, socket, head) => {
        srv.emit('upgrade', req, socket, head);
      });
      ipv6Srv.listen(port, '::', () => {
        // Dual-stack IPv6 active
      });
    } catch {
      // IPv6 optional
    }
  };

  bindDualStack(server, PORT, 'Primary');

  // Also bind alternate port (8080 or 3000) so user can access either port seamlessly
  const SECONDARY_PORT = PORT === 3000 ? 8080 : (PORT === 8080 ? 3000 : null);
  if (SECONDARY_PORT) {
    const secondaryServer = http.createServer(app);
    secondaryServer.on('upgrade', (req, socket, head) => {
      server.emit('upgrade', req, socket, head);
    });
    bindDualStack(secondaryServer, SECONDARY_PORT, 'Secondary');
  }
}

startServer();