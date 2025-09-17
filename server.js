const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const pdf = require("pdf-parse");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Fetch URL and extract text (HTML pages or PDFs)
async function fetchUrlText(url) {
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  const contentType = (res.headers["content-type"] || "").toLowerCase();

  // PDF
  if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
    const data = await pdf(res.data);
    return (data.text || "").replace(/\s+/g, " ").trim();
  }

  // HTML
  const html = res.data.toString("utf8");
  const $ = cheerio.load(html);
  let text = $("article").text() || $("main").text() || $("body").text() || "";
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

// Fake summarizer (replace with AI later)
async function summarizeWithAI({ text, url, title }) {
  if (text) {
    const trimmed = text.trim();
    return trimmed.length > 600 ? trimmed.slice(0, 600) + "..." : trimmed;
  }
  return `No text available to summarize for ${title || url || "unknown"}.`;
}

app.post("/summarize", async (req, res) => {
  try {
    const { text, url, title } = req.body;
    let inputText = (text && String(text).trim()) || null;

    if (!inputText && url) {
      inputText = await fetchUrlText(url);
    }

    if (!inputText) {
      return res.status(400).json({ error: "No text or URL provided / fetched." });
    }

    const summary = await summarizeWithAI({ text: inputText, url, title });
    return res.json({ summary });
  } catch (err) {
    console.error("Error /summarize:", err.message || err);
    return res.status(500).json({ error: "Server error: " + (err.message || "unknown") });
  }
});

app.get("/", (req, res) => res.send("Summarizer server running. POST /summarize"));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
