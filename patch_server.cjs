const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const newRoute = `
  // Planner API Route
  app.post("/api/plan", async (req, res) => {
    try {
      const { location, occupation, modelConfig } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      const modelName = modelConfig?.model || "gemini-3.5-flash";
      const config = {
        systemInstruction: "You are an expert AI meteorological advisor. Based on the user's location and occupation, analyze likely upcoming weather patterns (specifically focusing on monsoon/heavy rain/extreme weather if applicable) and formulate a practical, actionable plan to help them prepare, stay safe, and minimize disruption to their work. Format your response cleanly using Markdown."
      };
      
      const contents = [{ role: "user", parts: [{ text: \`I live in \${location} and my occupation is \${occupation}. Please predict future weather patterns and formulate an action plan for me.\` }] }];
      
      const tools = [{ googleSearch: {} }];
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
        tools
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Plan API error:", error.message);
      res.status(500).json({ error: "Failed to generate plan" });
    }
  });

  // Vite middleware for development
`;

content = content.replace('  // Vite middleware for development', newRoute);
fs.writeFileSync('server.ts', content);
console.log('patched server.ts');
