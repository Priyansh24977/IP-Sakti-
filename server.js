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
    const { question, jurisdiction, productType, inputLanguage, outputLanguage } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Please enter a question.",
      });
    }

    const result = await runRAG(question.trim(), {
      userJurisdiction: jurisdiction,
      userProductType: productType,
      inputLanguage: inputLanguage || "English",
      outputLanguage: outputLanguage || "English",
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