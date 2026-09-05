require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const config = {
      systemInstruction: "You are an expert AI meteorological advisor."
    };
    const contents = [{ role: "user", parts: [{ text: "Hello" }] }];
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config,
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.error("Error status:", e.status);
    console.error("Error message:", e.message);
  }
}
test();
