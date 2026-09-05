import express from "express";
import { runRAG } from "./ask.js";

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "IP-SAKTI Sahayak API",
  });
});

app.post("/api/ask", async (req, res) => {
  try {
    const { question, jurisdiction, productType, translateToHindi } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Please enter a question.",
      });
    }

    const result = await runRAG(question.trim(), {
      userJurisdiction: jurisdiction,
      userProductType: productType,
      // Optional: when true, adds one extra Gemini call to translate the
      // answer into Hindi. Off by default - only runs when the frontend
      // explicitly asks for it (e.g. a "Show in Hindi" toggle).
      translateToHindi: Boolean(translateToHindi),
    });

    res.json(result);
  } catch (error) {
    console.error("API error:", error);

    res.status(500).json({
      error: error.message || "Something went wrong.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`IP-SAKTI Sahayak API running at http://localhost:${PORT}`);
});