require("dotenv").config();
const https = require("https");

const data = JSON.stringify({
  model: "gpt-4o-mini",
  messages: [
    { role: "user", content: 'Say "Connection successful" in Vietnamese' },
  ],
  max_tokens: 50,
});

const options = {
  hostname: "api.openai.com",
  path: "/v1/chat/completions",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
};

console.log("Testing OpenAI connection...");

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    try {
      const json = JSON.parse(body);
      if (json.error) {
        console.log("❌ Error:", json.error.message);
      } else {
        console.log("✅ Success!");
        console.log("Response:", json.choices[0].message.content);
      }
    } catch (e) {
      console.log("❌ Parse Error:", e.message);
      console.log("Raw body:", body);
    }
  });
});

req.on("error", (e) => {
  console.error("❌ Request Error:", e.message);
});

req.write(data);
req.end();
