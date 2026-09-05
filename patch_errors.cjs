const fs = require('fs');

// Patch server.ts
let serverContent = fs.readFileSync('server.ts', 'utf-8');
serverContent = serverContent.replace(
  /} catch \(error: any\) {[\s\S]*?res\.status\(500\)\.json\({ error: error\.message \|\| "Failed to generate response" }\);\s*}/,
  `} catch (error: any) {
      let msg = error.message || "Failed to generate response";
      if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
        msg = "The model is currently experiencing high demand. Please wait a moment and try again.";
      }
      console.error("Chat API error:", msg); // Log only message, not full stack
      res.status(503).json({ error: msg });
    }`
);
fs.writeFileSync('server.ts', serverContent);
console.log('patched server.ts');

// Patch ChatAssistant.tsx
let clientContent = fs.readFileSync('src/components/ChatAssistant.tsx', 'utf-8');
clientContent = clientContent.replace(
  /if \(!response\.ok\) {[\s\S]*?throw new Error\('Failed to get response'\);\s*}/,
  `if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get response');
      }`
);
clientContent = clientContent.replace(
  /} catch \(error\) {[\s\S]*?console\.error\(error\);[\s\S]*?setMessages\(\[\.\.\.newMessages, { role: 'model', parts: \[\{ text: "⚠️ I'm sorry, I encountered an error while analyzing that request\." \}\] \}\]\);[\s\S]*?}/,
  `} catch (error: any) {
      const errMsg = error.message || "I encountered an error while analyzing that request.";
      setMessages([...newMessages, { role: 'model', parts: [{ text: \`⚠️ \${errMsg}\` }] }]);
    }`
);
fs.writeFileSync('src/components/ChatAssistant.tsx', clientContent);
console.log('patched ChatAssistant.tsx');
