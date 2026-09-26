import { generateMeteorologicalResponse } from './_meteorologicalEngine';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizeLog = (str: string): string => {
  if (!str) return '';
  let sanitized = String(str);
  if (process.env.GEMINI_API_KEY) {
    sanitized = sanitized.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED_API_KEY]');
  }
  return sanitized.replace(/key=[A-Za-z0-9_\-]+/g, 'key=[REDACTED]');
};

async function parseBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  if (typeof req.on === 'function') {
    try {
      const buffers: any[] = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString('utf-8');
      if (raw) return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const { history, message, modelConfig, apiKey: clientApiKey } = body || {};
  const headerKey = req.headers ? (req.headers['x-gemini-api-key'] as string | undefined) : undefined;
  const apiKey = clientApiKey || headerKey || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  const userQuery = message || "Hello";

  // If no API key configured, use built-in synoptic intelligence engine
  if (!apiKey || apiKey.trim() === '' || apiKey.trim().length < 15 || apiKey.trim().startsWith('TODO')) {
    const fallbackText = generateMeteorologicalResponse(userQuery);
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  }

  // Build sanitized turn history
  const contents: any[] = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history) {
      if (!h || !h.parts || !h.parts[0]?.text) continue;
      const text = h.parts[0].text.trim();
      if (!text || text.startsWith('⚠️')) continue;

      if (contents.length === 0) {
        if (h.role === 'user') {
          contents.push({ role: 'user', parts: [{ text }] });
        }
      } else {
        const lastRole = contents[contents.length - 1].role;
        if (h.role !== lastRole) {
          contents.push({ role: h.role, parts: [{ text }] });
        }
      }
    }
  }

  // Ensure last item in contents is not user before appending current user message
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }
  contents.push({ role: 'user', parts: [{ text: userQuery }] });

  try {
    let ai: any = null;
    try {
      const genAiMod = await import('@google/genai');
      ai = new genAiMod.GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'samvartka-ai',
          }
        }
      });
    } catch (importErr: any) {
      console.warn("Notice: GoogleGenAI import error in chat:", sanitizeLog(String(importErr)));
      const fallbackText = generateMeteorologicalResponse(userQuery);
      return res.status(200).json({ 
        text: fallbackText, 
        modelUsed: 'samvartka-synoptic-core', 
        isLive: false 
      });
    }

    const requestedModel = modelConfig?.model || 'gemini-2.0-flash';
    const candidates = [
      requestedModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-pro',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    const baseConfig: any = {
      systemInstruction: "You are an expert meteorologist and AI advisor embedded inside the SAMVARTAKA Monsoon Rainfall Post-Processor. You have comprehensive understanding of tropical meteorology, the Indian Summer Monsoon, synoptic regimes (Active, Break, Normal, Post-Monsoon), Numerical Weather Prediction (ECMWF, GFS, NCUM), bias correction using Quantile Regression Forests (QRF), Doppler radar, and hydrological flood risk. Answer clearly, accurately, and authoritatively using Markdown.",
    };

    if (modelConfig?.useSearch) {
      baseConfig.tools = [{ googleSearch: {} }];
    }

    for (const candidate of candidates) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config: baseConfig,
        });

        const rawText = response.text || 
          response.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("\n") || 
          "";

        if (rawText.trim().length > 0) {
          return res.status(200).json({ 
            text: rawText.trim(), 
            modelUsed: candidate, 
            isLive: true 
          });
        }
      } catch (err: any) {
        const errStr = sanitizeLog(String(err?.message || err));
        console.warn(`Model ${candidate} notice:`, errStr);
        // If 404 or NOT_FOUND, try next candidate
        if (errStr.includes('NOT_FOUND') || errStr.includes('404')) {
          continue;
        }
        // If quota or rate limited, return synoptic fallback immediately
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota')) {
          const fallbackText = generateMeteorologicalResponse(userQuery);
          return res.status(200).json({ 
            text: fallbackText, 
            modelUsed: 'samvartka-synoptic-core', 
            isLive: false 
          });
        }
      }
    }

    // Fallback if all models exhausted
    const fallbackText = generateMeteorologicalResponse(userQuery);
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  } catch (outerErr: any) {
    console.warn("Outer Gemini error caught, using synoptic fallback:", sanitizeLog(String(outerErr)));
    const fallbackText = generateMeteorologicalResponse(userQuery);
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  }
}
