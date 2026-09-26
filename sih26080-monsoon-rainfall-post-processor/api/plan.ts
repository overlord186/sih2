import { generateMeteorologicalPlan } from './_meteorologicalEngine';

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
  // CORS
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
  const { location, occupation, modelConfig, weatherContext, apiKey: clientApiKey } = body || {};
  const loc = location || 'Nagpur (Sonegaon)';
  const occ = occupation || 'Farmer & Agricultural Producer';

  const headerKey = req.headers ? (req.headers['x-gemini-api-key'] as string | undefined) : undefined;
  const apiKey = clientApiKey || headerKey || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  // Fallback function
  const produceFallback = () => generateMeteorologicalPlan(loc, occ, weatherContext);

  if (!apiKey || apiKey.trim() === '' || apiKey.trim().length < 15 || apiKey.trim().startsWith('TODO')) {
    const fallbackText = produceFallback();
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  }

  try {
    let ai: any = null;
    try {
      const genAiMod = await import('@google/genai');
      ai = new genAiMod.GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'samvartka-ai' } }
      });
    } catch (importErr: any) {
      console.warn("Notice: GoogleGenAI module import notice:", sanitizeLog(String(importErr)));
      const fallbackText = produceFallback();
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

    const sysInstruction = `You are an elite research meteorologist and operational disaster resilience advisor embedded inside SAMVARTAKA (India Monsoon Rainfall Post-Processor). Formulate a crisp, highly structured, authoritative, and sector-tailored Synoptic Action & Resilience Plan. Format your output strictly in professional GitHub Markdown with these exact sections:

### 🌦️ Synoptic Action & Resilience Plan: ${loc}
**Target Sector:** ${occ}  
**Meteorological Engine:** SAMVARTAKA Synoptic Intelligence (Active Live AI)  
**IMD Alert Classification:** [🟢 Green / 🟡 Yellow / 🟠 Orange / 🔴 Red Alert with exact quantitative mm/24h threshold]

---

#### 1. 🛰️ Synoptic Risk Profile & Agro-Ecological State
- Atmospheric regime classification, moisture convergence, low-level jet velocity, and local topographic dynamics.
- Numerical weather telemetry synthesis: 7-day expected precipitation total (mm), peak rain date and single-day max rain (mm), rain probability %, and peak wind gusts.

#### 2. 🎯 Sector Hazard Matrix & Asset Impact (${occ})
- Specific operational vulnerabilities (e.g. for Farmers: specific crops like Cotton, Soybean, Pulses, Oranges, Vertisol/black-cotton soil drainage, fertilizer/pesticide wash-off; for Construction: crane wind limit, trench slumping; for Logistics: highway choke points, container sealing).

#### 3. ⏱️ Phased Tactical Action Protocol
- T-48h to T-24h (Readiness Phase): Concrete preventative actions.
- T-12h to T-0h (Active Storm Event): Operational stoppage triggers and live protection.
- Post-Event (Recovery & Assessment): Field drainage, structural checks, crop/asset revival.

#### 4. 🛡️ Critical Go / No-Go Decision Matrix
- Explicit quantitative threshold triggers (e.g. wind speed cutoff, rainfall intensity mm/hr, standing water limits).

#### 5. ✅ Immediate Tactical Readiness Checklist
- Actionable checkboxes [ ] for rapid operational sign-off.`;

    let promptText = `Generate a crisp, operational, sector-tailored Synoptic Action & Resilience Plan for location: "${loc}", target sector: "${occ}".`;
    if (weatherContext) {
      const weatherStr = typeof weatherContext === 'string' ? weatherContext : JSON.stringify(weatherContext);
      promptText += `\n\nReal-time 7-day numerical weather telemetry:\n${weatherStr}\n\nBase your quantitative risk assessment directly on this forecast data.`;
    }

    const contents = [{ role: 'user', parts: [{ text: promptText }] }];

    for (const candidate of candidates) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config: {
            systemInstruction: sysInstruction,
            temperature: 0.3,
            maxOutputTokens: 2500,
          }
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
        console.warn(`Model ${candidate} notice in planner:`, errStr);
        if (errStr.includes('NOT_FOUND') || errStr.includes('404')) {
          continue;
        }
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota')) {
          const fallbackText = produceFallback();
          return res.status(200).json({ 
            text: fallbackText, 
            modelUsed: 'samvartka-synoptic-core', 
            isLive: false 
          });
        }
      }
    }

    const fallbackText = produceFallback();
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  } catch (outerErr: any) {
    console.warn("Planner outer error caught, using synoptic fallback:", sanitizeLog(String(outerErr)));
    const fallbackText = produceFallback();
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  }
}
