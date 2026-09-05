require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const config = { systemInstruction: "Hello" };
    const contents = [{ role: "user", parts: [{ text: "Hello" }] }];
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents,
      config,
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
