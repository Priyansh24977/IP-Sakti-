// ask.js
// PURPOSE:
// 1. Translate user input if required
// 2. Classify jurisdiction/topic
// 3. Create query embedding
// 4. Retrieve relevant legal sources using cosine similarity
// 5. Generate grounded answer using AICredits + Gemini 3.1 Flash Lite
// 6. Translate final answer if required
//
// Run with:
// node ask.js "your question here"

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { translateWithBhashini } from "./bhashini.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================================================
// AI CONFIGURATION
// ==================================================

// AICredits - chat / translation / classification
const ai = new OpenAI({
  baseURL:
    process.env.AICREDITS_BASE_URL ||
    "https://api.aicredits.in/v1",

  apiKey: process.env.AICREDITS_API_KEY,
});

// Google Gemini - embeddings
// Kept unchanged so the existing vector_store.json
// remains compatible with the same embedding model.
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

const embeddingModel =
  genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });

// AICredits model
const CHAT_MODEL =
  "google/gemini-3.1-flash-lite";

const VECTOR_STORE_FILE =
  path.join(__dirname, "vector_store.json");

// ==================================================
// VALIDATE AI CREDENTIALS
// ==================================================

function validateAICredits() {
  if (!process.env.AICREDITS_API_KEY) {
    throw new Error(
      "Missing AICREDITS_API_KEY in .env"
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY in .env"
    );
  }
}

// ==================================================
// AICREDITS CHAT HELPER
// ==================================================

async function callAI(
  messages,
  options = {}
) {
  validateAICredits();

  const response =
    await ai.chat.completions.create({
      model: CHAT_MODEL,

      messages,

      temperature:
        options.temperature ?? 0.2,

      max_tokens:
        options.max_tokens ?? 1500,
    });

  const text =
    response?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error(
      "AICredits returned an empty response."
    );
  }

  return text.trim();
}

// ==================================================
// STEP A
// COSINE SIMILARITY
// ==================================================

function cosineSimilarity(
  vecA,
  vecB
) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (
    let i = 0;
    i < vecA.length;
    i++
  ) {
    dotProduct +=
      vecA[i] * vecB[i];

    normA +=
      vecA[i] * vecA[i];

    normB +=
      vecB[i] * vecB[i];
  }

  const denominator =
    Math.sqrt(normA) *
    Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

// ==================================================
// STEP B
// CLASSIFY QUERY
// ==================================================

async function classifyQuery(
  question
) {
  const prompt = `You are a classifier for an Ayurveda IP legal assistant.

Classify the user's question into exactly one jurisdiction:

- India
- US
- Unclear

Use US when the question explicitly mentions:
United States, USA, US, USPTO, American patent law, FDA, or US regulations.

Use India when the question explicitly mentions:
India, Indian patent law, Indian regulations, IPO, TKDL, AYUSH, etc.

If no jurisdiction can be confidently determined, use Unclear.

Respond with ONLY a JSON object:
{
  "jurisdiction": "India" or "US" or "Unclear",
  "topic": "short 2-4 word topic"
}

Question:
${question}`;

  try {
    const text = await callAI(
      [
        {
          role: "system",
          content:
            "You classify Ayurveda IP questions. Return only valid JSON when requested.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        temperature: 0,
        max_tokens: 100,
      }
    );

    const cleaned =
      text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    const parsed =
      JSON.parse(cleaned);

    return {
      jurisdiction:
        parsed.jurisdiction ||
        "Unclear",

      topic:
        parsed.topic ||
        "general",
    };
  } catch {
    return {
      jurisdiction: "Unclear",
      topic: "general",
    };
  }
}

// ==================================================
// EXTRACT TOPIC ONLY
// ==================================================

async function extractTopicOnly(
  question
) {
  const prompt = `In 2-4 words, identify the short topic of this Ayurveda IP question.

Respond with ONLY the topic phrase.

Question:
${question}`;

  try {
    const text = await callAI(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        temperature: 0,
        max_tokens: 30,
      }
    );

    return text
      .replace(/^"|"$/g, "")
      .trim();

  } catch {
    return "general";
  }
}

// ==================================================
// STEP C
// FILTER DOCUMENTS BY JURISDICTION
// ==================================================

function filterByJurisdiction(
  vectorStore,
  jurisdiction
) {
  if (
    !jurisdiction ||
    jurisdiction === "Unclear" ||
    jurisdiction === "Both"
  ) {
    return vectorStore;
  }

  const prefix =
    jurisdiction.toLowerCase() === "india"
      ? "india_"
      : "us_";

  return vectorStore.filter(
    (item) => {
      const filename =
        item.source.toLowerCase();

      const hasAnyPrefix =
        filename.startsWith("india_") ||
        filename.startsWith("us_");

      return (
        filename.startsWith(prefix) ||
        !hasAnyPrefix
      );
    }
  );
}

// ==================================================
// STEP D
// RETRIEVE RELEVANT CHUNKS
// ==================================================

async function retrieveRelevantChunks(
  question,
  vectorStore,
  jurisdiction,
  topN = 3
) {
  const filteredStore =
    filterByJurisdiction(
      vectorStore,
      jurisdiction
    );

  const questionEmbeddingResult =
    await embeddingModel.embedContent(
      question
    );

  const questionEmbedding =
    questionEmbeddingResult
      .embedding.values;

  const scored =
    filteredStore.map(
      (item) => ({
        ...item,

        score:
          cosineSimilarity(
            questionEmbedding,
            item.embedding
          ),
      })
    );

  scored.sort(
    (a, b) =>
      b.score - a.score
  );

  return scored.slice(
    0,
    topN
  );
}

// ==================================================
// STEP E
// GENERATE GROUNDED ANSWER
// ==================================================

async function generateAnswer(
  question,
  relevantChunks,
  classification,
  productType,
  retries = 4
) {
  const context =
    relevantChunks
      .map(
        (c, i) =>
          `[Source ${i + 1}: ${c.source}]\n${c.text}`
      )
      .join(
        "\n\n---\n\n"
      );

  const productContext =
    productType
      ? `\nThe user has indicated this concerns a: ${productType}.`
      : "";

  const prompt = `You are IP-SAKTI Sahayak, an AI assistant for Ayurveda IP and regulatory guidance.

Query classification:
Jurisdiction = ${classification.jurisdiction}
Topic = ${classification.topic}
${productContext}

IMPORTANT RULES:

1. Answer ONLY using the information contained in the provided sources.
2. Do not invent laws, sections, regulations, cases, or requirements.
3. Clearly distinguish India and US requirements.
4. Cite the source number for claims.
5. If the sources do not contain enough information, explicitly say that the available sources are insufficient.
6. Do not present the answer as a substitute for professional legal advice.
7. Keep the answer clear and practical.
8. Preserve legal section numbers, Act names, organization names, and technical terms.

SOURCES:

${context}

USER QUESTION:

${question}

Provide a clear, grounded and cited answer.`;

  for (
    let attempt = 1;
    attempt <= retries;
    attempt++
  ) {
    try {
      return await callAI(
        [
          {
            role: "system",
            content:
              "You are IP-SAKTI Sahayak. You must strictly follow the provided legal sources and never fabricate legal information.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          temperature: 0.1,
          max_tokens: 1800,
        }
      );

    } catch (err) {
      const message =
        err?.message || "";

      const is429 =
        message.includes("429") ||
        message.includes(
          "Too Many Requests"
        ) ||
        message.includes(
          "rate"
        );

      const is5xx =
        message.includes("500") ||
        message.includes("502") ||
        message.includes("503") ||
        message.includes("504");

      const isNetworkError =
        message.includes(
          "fetch failed"
        );

      if (
        (is429 ||
          is5xx ||
          isNetworkError) &&
        attempt < retries
      ) {
        const waitTime =
          is429
            ? 5000
            : 2000;

        console.log(
          `   ⏳ Retrying in ${
            waitTime / 1000
          }s (${attempt}/${retries})...`
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              waitTime
            )
        );

      } else {
        throw err;
      }
    }
  }
}

// ==================================================
// STEP F
// INPUT TRANSLATION
// ==================================================

async function translateInputToEnglish(
  question,
  inputLanguage
) {
  if (
    !question ||
    !inputLanguage ||
    inputLanguage === "English"
  ) {
    return question;
  }

  // ----------------------------------------------
  // Try Bhashini first
  // ----------------------------------------------

  try {
    const translated =
      await translateWithBhashini(
        question,
        inputLanguage,
        "English"
      );

    console.log(
      `   🌐 Input translated via Bhashini (${inputLanguage} → English)`
    );

    return translated;

  } catch (bhashiniErr) {
    console.log(
      `   ⚠️ Bhashini input translation failed (${bhashiniErr.message})`
    );

    console.log(
      "   ↪ Using AICredits Gemini translation..."
    );
  }

  // ----------------------------------------------
  // AICredits Gemini fallback
  // ----------------------------------------------

  try {
    const prompt = `Translate the following question from ${inputLanguage} to English.

Preserve the exact legal meaning and intent.

Do not explain the translation.

Return ONLY the translated question.

QUESTION:
${question}`;

    return await callAI(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        temperature: 0,
        max_tokens: 500,
      }
    );

  } catch (err) {
    console.log(
      `   ⚠️ Gemini translation failed: ${err.message}`
    );

    console.log(
      "   ↪ Proceeding with original text."
    );

    return question;
  }
}

// ==================================================
// STEP G
// OUTPUT TRANSLATION
// ==================================================

async function translateAnswer(
  text,
  targetLanguage
) {
  if (
    !text ||
    targetLanguage === "English"
  ) {
    return null;
  }

  // ----------------------------------------------
  // Try Bhashini first
  // ----------------------------------------------

  try {
    const translated =
      await translateWithBhashini(
        text,
        "English",
        targetLanguage
      );

    console.log(
      `   🌐 Translated via Bhashini (English → ${targetLanguage})`
    );

    return translated;

  } catch (bhashiniErr) {
    console.log(
      `   ⚠️ Bhashini output translation failed (${bhashiniErr.message})`
    );

    console.log(
      "   ↪ Using AICredits Gemini translation..."
    );
  }

  // ----------------------------------------------
  // AICredits Gemini fallback
  // ----------------------------------------------

  try {
    const prompt = `Translate the following legal/IP guidance text into clear, natural ${targetLanguage}.

IMPORTANT:

- Preserve the exact meaning.
- Keep Act names in English.
- Keep Section numbers unchanged.
- Keep organization names unchanged.
- Keep acronyms such as TKDL, USPTO, IP and RAG unchanged.
- Keep citation tags such as [Source 1], [Source 2] unchanged.
- Do not add new legal information.
- Do not remove any claims or citations.

TEXT:

${text}

Return ONLY the translated text.`;

    return await callAI(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        temperature: 0.1,
        max_tokens: 2000,
      }
    );

  } catch (err) {
    console.log(
      `   ⚠️ Gemini output translation failed: ${err.message}`
    );

    return null;
  }
}

// ==================================================
// MAIN RAG FUNCTION
// ==================================================

export async function runRAG(
  question,
  options = {}
) {
  const {
    userJurisdiction,
    userProductType,
    inputLanguage = "English",
    outputLanguage = "English",
  } = options;

  validateAICredits();

  if (
    !fs.existsSync(
      VECTOR_STORE_FILE
    )
  ) {
    throw new Error(
      "No vector_store.json found. Run 'npm run embed' first."
    );
  }

  const startTime =
    Date.now();

  // ----------------------------------------------
  // 1. Translate input
  // ----------------------------------------------

  const englishQuestion =
    await translateInputToEnglish(
      question,
      inputLanguage
    );

  // ----------------------------------------------
  // 2. Load vector store
  // ----------------------------------------------

  const vectorStore =
    JSON.parse(
      fs.readFileSync(
        VECTOR_STORE_FILE,
        "utf-8"
      )
    );

  // ----------------------------------------------
  // 3. Determine jurisdiction
  // ----------------------------------------------

  let classification;

  if (
    userJurisdiction &&
    userJurisdiction !== "Unclear"
  ) {
    const topic =
      await extractTopicOnly(
        englishQuestion
      );

    classification = {
      jurisdiction:
        userJurisdiction,

      topic,
    };

  } else {
    classification =
      await classifyQuery(
        englishQuestion
      );
  }

  // ----------------------------------------------
  // 4. Retrieve sources
  // ----------------------------------------------

  const relevantChunks =
    await retrieveRelevantChunks(
      englishQuestion,
      vectorStore,
      classification.jurisdiction
    );

  // ----------------------------------------------
  // 5. Generate grounded answer
  // ----------------------------------------------

  const answer =
    await generateAnswer(
      englishQuestion,
      relevantChunks,
      classification,
      userProductType
    );

  // ----------------------------------------------
  // 6. Translate final answer
  // ----------------------------------------------

  const translatedAnswer =
    await translateAnswer(
      answer,
      outputLanguage
    );

  const elapsed =
    (
      (Date.now() - startTime) /
      1000
    ).toFixed(2);

  return {
    answer,

    translatedAnswer,

    inputLanguage,

    outputLanguage,

    originalQuestion:
      question,

    englishQuestion,

    jurisdiction:
      classification.jurisdiction,

    topic:
      classification.topic,

    productType:
      userProductType || null,

    sources:
      relevantChunks.map(
        (chunk) => ({
          source:
            chunk.source,

          score:
            Number(
              chunk.score.toFixed(3)
            ),
        })
      ),

    responseTime:
      Number(elapsed),
  };
}

// ==================================================
// CLI TEST
// ==================================================

async function main() {
  const question =
    process.argv
      .slice(2)
      .join(" ");

  if (!question) {
    console.log(
      'Usage: node ask.js "your question here"'
    );

    return;
  }

  if (
    !fs.existsSync(
      VECTOR_STORE_FILE
    )
  ) {
    console.log(
      "⚠️ No vector_store.json found. Run 'npm run embed' first."
    );

    return;
  }

  const startTime =
    Date.now();

  const vectorStore =
    JSON.parse(
      fs.readFileSync(
        VECTOR_STORE_FILE,
        "utf-8"
      )
    );

  console.log(
    `\n❓ Question: ${question}\n`
  );

  console.log(
    "🔍 Classifying query..."
  );

  const classification =
    await classifyQuery(
      question
    );

  console.log(
    `   → Jurisdiction: ${classification.jurisdiction}, Topic: ${classification.topic}`
  );

  console.log(
    "📚 Retrieving relevant sources..."
  );

  const relevantChunks =
    await retrieveRelevantChunks(
      question,
      vectorStore,
      classification.jurisdiction
    );

  relevantChunks.forEach(
    (c, i) =>
      console.log(
        `   ${i + 1}. ${c.source} (similarity: ${c.score.toFixed(3)})`
      )
  );

  console.log(
    "\n🤖 Generating answer with AICredits + Gemini 3.1 Flash Lite...\n"
  );

  const answer =
    await generateAnswer(
      question,
      relevantChunks,
      classification
    );

  const elapsed =
    (
      (Date.now() - startTime) /
      1000
    ).toFixed(2);

  console.log(
    "─".repeat(60)
  );

  console.log(answer);

  console.log(
    "─".repeat(60)
  );

  console.log(
    `\n⏱️ Response time: ${elapsed}s`
  );
}

// ==================================================
// DIRECT EXECUTION
// ==================================================

if (
  process.argv[1] ===
  fileURLToPath(import.meta.url)
) {
  main().catch(
    (err) =>
      console.error(
        "❌ Error:",
        err.message
      )
  );
}