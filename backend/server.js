import express from "express";
import cors from "cors";
import { runRAG } from "./ask.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173"
      
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "IP-SAKTI Sahayak API",
  });
});

app.post("/api/ask", async (req, res) => {
  try {
    const {
      question,
      jurisdiction,
      productType,
      inputLanguage,
      outputLanguage,
    } = req.body;

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`IP-SAKTI Sahayak API running on port ${PORT}`);
});