export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const diagnostics: any = { nodeVersion: process.version };

  try {
    const genai = await import('@google/genai');
    diagnostics.genai = 'loaded: ' + Boolean(genai.GoogleGenAI);
  } catch (e: any) {
    diagnostics.genaiError = e.stack || e.message || String(e);
  }

  try {
    const engine = await import('../src/utils/meteorologicalChatEngine');
    diagnostics.engine = 'loaded: ' + typeof engine.generateMeteorologicalPlan;
    diagnostics.testPlan = engine.generateMeteorologicalPlan('Nagpur', 'Farmer').slice(0, 100);
  } catch (e: any) {
    diagnostics.engineError = e.stack || e.message || String(e);
  }

  return res.status(200).json(diagnostics);
}
