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

const SIMILARITY_THRESHOLD = 0.60;
const TOP_K = 3;

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

// invalid jusrisdiction detection based on keywords in the question

function detectExplicitJurisdiction(question = "") {
  const q = question.toLowerCase();

  const indiaKeywords = [
    "india",
    "indian",
    "indian patent",
    "indian ip",
    "indian law",
    "indian laws",
    "ipindia",
    "cgpdtm",
    "controller general of patents",
    "controller general of patents designs and trademarks",
    "tkdl",
    "traditional knowledge digital library",
    "ayush",
    "ministry of ayush",
    "nba",
    "national biodiversity authority",
    "biological diversity act"
  ];

  const usKeywords = [
    "usa",
    "u.s.a.",
    "u.s.",
    "uspto",
    "united states",
    "united states of america",
    "american patent",
    "american ip",
    "us patent",
    "u.s. patent",
    "us law",
    "u.s. law"
  ];

  const indiaMatch = indiaKeywords.some((keyword) =>
    q.includes(keyword)
  );

  const usMatch = usKeywords.some((keyword) =>
    q.includes(keyword)
  );

  // If both jurisdictions are explicitly mentioned,
  // don't force a mismatch decision here.
  if (indiaMatch && usMatch) {
    return "Unclear";
  }

  if (indiaMatch) {
    return "India";
  }

  if (usMatch) {
    return "US";
  }

  return "Unclear";
}

// mistmatch detection and response creation

function createJurisdictionMismatchResponse(
  selectedJurisdiction,
  detectedJurisdiction,
  outputLanguage
) {
  const answer = `Your question appears to relate to ${detectedJurisdiction} jurisdiction, but ${selectedJurisdiction} jurisdiction is currently selected.

Please switch the jurisdiction to ${detectedJurisdiction} and ask the question again so that I can provide information from the appropriate legal sources.

I will not provide a potentially misleading answer using the currently selected jurisdiction.`;

  return {
    answer,
    translatedAnswer: null,
    inputLanguage: "English",
    outputLanguage,
    jurisdiction: selectedJurisdiction,
    topic: "Jurisdiction mismatch",
    sources: [],
    responseTime: 0,
    abstained: true,
    abstentionReason: "Question jurisdiction does not match selected jurisdiction.",
    jurisdictionMismatch: true,
    detectedJurisdiction,
    selectedJurisdiction,
  };
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
  topN = TOP_K
) {
  // ----------------------------------------------
  // 1. Filter documents based on jurisdiction
  // ----------------------------------------------
  const filteredStore =
    filterByJurisdiction(
      vectorStore,
      jurisdiction
    );

  // ----------------------------------------------
  // 2. Create embedding for user query
  // ----------------------------------------------
  const questionEmbeddingResult =
    await embeddingModel.embedContent(
      question
    );

  const questionEmbedding =
    questionEmbeddingResult
      .embedding.values;

  // ----------------------------------------------
  // 3. Calculate cosine similarity
  //    between query and every eligible chunk
  // ----------------------------------------------
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

  // ----------------------------------------------
  // 4. Sort by highest similarity
  // ----------------------------------------------
  scored.sort(
    (a, b) =>
      b.score - a.score
  );

  // ----------------------------------------------
  // 5. Check best similarity score
  // ----------------------------------------------
  const bestScore =
    scored.length > 0
      ? scored[0].score
      : 0;

  console.log(
    `  Best similarity score: ${bestScore.toFixed(3)}`
  );

  console.log(
    `  Similarity threshold: ${SIMILARITY_THRESHOLD}`
  );

  // ----------------------------------------------
  // 6. SAFE ABSTENTION
  // ----------------------------------------------
  // If even the best matching chunk is below
  // the threshold, do NOT send irrelevant
  // context to Gemini.
  // ----------------------------------------------
  if (
    bestScore <
    SIMILARITY_THRESHOLD
  ) {
    console.log(
      " No sufficiently relevant sources found."
    );

    return [];
  }

  // ----------------------------------------------
  // 7. Keep only chunks above threshold
  // ----------------------------------------------
  const relevantChunks =
    scored
      .filter(
        (item) =>
          item.score >=
          SIMILARITY_THRESHOLD
      )
      .slice(
        0,
        topN
      );

  console.log(
    ` Retrieved ${relevantChunks.length} relevant chunks.`
  );

  relevantChunks.forEach(
    (chunk, index) => {
      console.log(
        `      ${index + 1}. ${chunk.source} → ${chunk.score.toFixed(3)}`
      );
    }
  );

  return relevantChunks;
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

// First detect jurisdiction explicitly mentioned
// in the user's question.
const explicitJurisdiction =
  detectExplicitJurisdiction(
    englishQuestion
  );

// If the question explicitly mentions India/US,
// use that for mismatch detection.
//
// Otherwise, use the existing LLM classifier.
const detectedJurisdiction =
  explicitJurisdiction !== "Unclear"
    ? explicitJurisdiction
    : (
        await classifyQuery(
          englishQuestion
        )
      ).jurisdiction;

// Extract topic separately.
const topic =
  await extractTopicOnly(
    englishQuestion
  );

// ----------------------------------------------
// 3A. JURISDICTION MISMATCH CHECK
// ----------------------------------------------

if (
  userJurisdiction &&
  userJurisdiction !== "Unclear" &&
  detectedJurisdiction !== "Unclear" &&
  userJurisdiction !== detectedJurisdiction
) {
  console.log(
    `  Jurisdiction mismatch: selected=${userJurisdiction}, detected=${detectedJurisdiction}`
  );

  const mismatchAnswer =
    `Your question appears to relate to ${detectedJurisdiction} jurisdiction, but ${userJurisdiction} jurisdiction is currently selected.

Please switch the jurisdiction to ${detectedJurisdiction} and ask the question again so that I can provide information from the appropriate legal sources.

I will not provide a potentially misleading answer using the currently selected jurisdiction.`;

  const translatedMismatch =
    await translateAnswer(
      mismatchAnswer,
      outputLanguage
    );

  return {
    answer: mismatchAnswer,

    translatedAnswer:
      outputLanguage === "English"
        ? mismatchAnswer
        : translatedMismatch,

    inputLanguage,
    outputLanguage,

    originalQuestion:
      question,

    englishQuestion,

    jurisdiction:
      userJurisdiction,

    detectedJurisdiction,

    topic,

    productType:
      userProductType || null,

    sources: [],

    responseTime:
      Number(
        (
          (Date.now() - startTime) /
          1000
        ).toFixed(2)
      ),

    abstained: true,

    abstentionReason:
      "Question jurisdiction does not match selected jurisdiction.",

    jurisdictionMismatch: true,
  };
}

// ----------------------------------------------
// 3B. CREATE FINAL CLASSIFICATION
// ----------------------------------------------

// The USER'S selected jurisdiction remains
// authoritative for retrieval.
//
// If user selected US → retrieve US documents.
// If user selected India → retrieve India documents.
//
// If user did not select a jurisdiction,
// use the detected jurisdiction.
classification = {
  jurisdiction:
    userJurisdiction &&
    userJurisdiction !== "Unclear"
      ? userJurisdiction
      : detectedJurisdiction,

  topic,
};


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
// SAFE ABSTENTION
// ----------------------------------------------
// If no source passed the similarity threshold,
// do not call Gemini with empty/irrelevant
// context. Instead, provide a transparent
// response and guidance to the user.
// ----------------------------------------------

if (
  relevantChunks.length === 0
) {
  console.log(
    "  Safe abstention triggered."
  );

  const answer =
    `I’m sorry, but I could not find sufficiently relevant information in the available legal sources to answer this question reliably.

Please try one of the following:

- Rephrase your question using more specific legal or Ayurveda-related terms.
- Specify the jurisdiction, such as India or the US.
- Mention the relevant IP area, such as patent, trademark, copyright, geographical indication, biodiversity, or traditional knowledge.
- If your question concerns a specific Ayurvedic formulation or product, provide its relevant details.

For legal decisions, filing strategies, or case-specific advice, please consult a qualified IP/legal professional.`;

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

    sources: [],

    responseTime:
      Number(elapsed),

    abstained: true,

    abstentionReason:
      "No sufficiently relevant sources found."
  };
}

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