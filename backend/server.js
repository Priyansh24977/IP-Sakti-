import "dotenv/config";

import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

import { runRAG } from "./ask.js";
import { requireAuth } from "./authMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================================
   SUPABASE SERVER CLIENT
========================================= */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

console.log("SUPABASE_URL:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_SECRET_KEY:", !!process.env.SUPABASE_SECRET_KEY);

/* =========================================
   MIDDLEWARE
========================================= */

app.use(
  cors({
    origin: [
      "https://ip-sakti-drab.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* =========================================
   HEALTH CHECK
========================================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "IP-SAKTI Sahayak API",
  });
});

/* =========================================
   ASK SAHAYAK
========================================= */

app.post("/api/ask", requireAuth, async (req, res) => {
  console.log("🔥 /api/ask REQUEST RECEIVED");

  try {
    const {
      question,
      jurisdiction,
      productType,
      inputLanguage,
      outputLanguage,
    } = req.body;

    /* ---------------------------------
       Validate question
    --------------------------------- */

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Please enter a question.",
      });
    }

    /* ---------------------------------
       Run RAG
    --------------------------------- */

    console.log("Running RAG...");

    const result = await runRAG(question.trim(), {
      userJurisdiction: jurisdiction,
      userProductType: productType,
      inputLanguage: inputLanguage || "English",
      outputLanguage: outputLanguage || "English",
    });

    console.log("RAG completed.");

    /* ---------------------------------
       Get authenticated user
    --------------------------------- */

    const userId = req.user?.sub;

    console.log("Authenticated User ID:", userId);

    if (!userId) {
      return res.status(401).json({
        error: "Unable to identify authenticated user.",
      });
    }

    /* ---------------------------------
       Save consultation
    --------------------------------- */

    console.log("Saving consultation...");

    const { data: savedConsultation, error: saveError } =
      await supabase
        .from("consultations")
        .insert({
          user_id: userId,
          question: question.trim(),

          answer:
            result.translatedAnswer ||
            result.answer ||
            "",

          jurisdiction:
            result.jurisdiction ||
            jurisdiction ||
            null,

          product_type:
            result.productType ||
            productType ||
            null,

          input_language:
            result.inputLanguage ||
            inputLanguage ||
            "English",

          output_language:
            result.outputLanguage ||
            outputLanguage ||
            "English",

          sources:
            result.sources ||
            [],
        })
        .select()
        .single();

    console.log(
      "Saved consultation:",
      savedConsultation
    );

    console.log(
      "Save error:",
      saveError
    );

    /* ---------------------------------
       Database error
    --------------------------------- */

    if (saveError) {
      console.error(
        "❌ CONSULTATION SAVE FAILED:",
        saveError
      );

      return res.status(500).json({
        error:
          "Answer generated, but consultation could not be saved.",
      });
    }

    console.log("✅ CONSULTATION SAVED SUCCESSFULLY");

    /* ---------------------------------
       Return result
    --------------------------------- */

    return res.json(result);

  } catch (error) {
    console.error("❌ API ERROR:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Something went wrong.",
    });
  }
});

/* =========================================
   START SERVER
========================================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `IP-SAKTI Sahayak API running on port ${PORT}`
  );
});