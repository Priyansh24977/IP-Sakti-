// ask.js
// PURPOSE: Take a user's question, find the most relevant document chunks
// (using cosine similarity between embeddings), then send those chunks +
// the question to Gemini to generate a grounded, cited answer.
//
// Run with: node ask.js "your question here"

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
// Using "-latest" alias so this doesn't break again when Google retires
// today's specific model version (they do this every few months).
const chatModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const VECTOR_STORE_FILE = path.join(__dirname, "vector_store.json");

// STEP A: Cosine similarity - a simple math formula that measures how
// "close in meaning" two embedding vectors are. Returns a value between
// -1 and 1; closer to 1 means more similar in meaning.
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// STEP B: Classify the query - simple version of your "jurisdiction/
// formulation classification" differentiator. We just ask Gemini directly.
//
// This is now a FALLBACK, only called when the user hasn't explicitly
// picked a jurisdiction from the UI dropdown. When they have, we skip
// this entirely - it's faster (one less API call) and more reliable
// (no risk of the model misreading an ambiguous question).
async function classifyQuery(question) {
  const prompt = `You are a classifier for an Ayurveda IP legal assistant.

Classify the user's question into exactly one jurisdiction:
- India
- US
- Unclear

Use US when the question explicitly mentions the United States, USA, US,
USPTO, American patent law, FDA, or US regulations.

Use India when the question explicitly mentions India, Indian patent law,
Indian regulations, IPO, TKDL, AYUSH, etc.

If no jurisdiction can be confidently determined, use Unclear.

Respond with ONLY a JSON object:
{"jurisdiction":"India" or "US" or "Unclear","topic":"short 2-4 word topic"}

Question: "${question}"`;

  const result = await chatModel.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      jurisdiction: "Unclear",
      topic: "general"
    };
  }
}

// Extracts just a "topic" label even when jurisdiction is already known
// from the UI - we still want a short topic tag for display, just without
// re-deciding jurisdiction.
async function extractTopicOnly(question) {
  const prompt = `In 2-4 words, what is the short topic of this Ayurveda IP
question? Respond with ONLY the topic phrase, nothing else.

Question: "${question}"`;

  try {
    const result = await chatModel.generateContent(prompt);
    return result.response.text().trim().replace(/^"|"$/g, "");
  } catch {
    return "general";
  }
}

// STEP C: Retrieve the top-N most relevant chunks for this question.
// If a jurisdiction is known (India or US), we filter the candidate pool
// to only that jurisdiction's documents BEFORE ranking by similarity -
// this prevents an India question from citing a US-only document (or
// vice versa) just because the topics are conceptually similar.
// Documents are expected to be named with a "india_" or "us_" prefix;
// any file without a recognized prefix is treated as jurisdiction-neutral
// and stays eligible for every jurisdiction.
function filterByJurisdiction(vectorStore, jurisdiction) {
  if (!jurisdiction || jurisdiction === "Unclear" || jurisdiction === "Both") {
    return vectorStore; // no filtering - search everything
  }

  const prefix = jurisdiction.toLowerCase() === "india" ? "india_" : "us_";

  return vectorStore.filter(item => {
    const filename = item.source.toLowerCase();
    const hasAnyPrefix = filename.startsWith("india_") || filename.startsWith("us_");
    // Keep it if it matches this jurisdiction's prefix, OR if the file
    // has no jurisdiction prefix at all (treated as neutral/shared).
    return filename.startsWith(prefix) || !hasAnyPrefix;
  });
}

async function retrieveRelevantChunks(question, vectorStore, jurisdiction, topN = 3) {
  const filteredStore = filterByJurisdiction(vectorStore, jurisdiction);

  const questionEmbeddingResult = await embeddingModel.embedContent(question);
  const questionEmbedding = questionEmbeddingResult.embedding.values;

  const scored = filteredStore.map(item => ({
    ...item,
    score: cosineSimilarity(questionEmbedding, item.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

// STEP D: Generate the final answer, grounded in the retrieved chunks.
// Retry logic covers two distinct failure modes:
// - 503 (server overloaded): usually resolves within a couple seconds
// - 429 (rate limit / quota exceeded): free-tier allows only ~5 requests
//   per minute, so this needs a much longer wait before retrying
async function generateAnswer(question, relevantChunks, classification, productType, retries = 3) {
  const context = relevantChunks
    .map((c, i) => `[Source ${i + 1}: ${c.source}]\n${c.text}`)
    .join("\n\n---\n\n");

  const productContext = productType
    ? `\nThe user has indicated this concerns a: ${productType}.`
    : "";

  const prompt = `You are IP-SAKTI Sahayak, an AI assistant for Ayurveda IP and regulatory guidance.
Query classification: Jurisdiction = ${classification.jurisdiction}, Topic = ${classification.topic}${productContext}

Answer the user's question using ONLY the information in the sources below.
Cite which source number you used for each claim. If the sources don't contain
enough information to answer confidently, say so clearly instead of guessing.

SOURCES:
${context}

USER QUESTION: ${question}

Provide a clear, well-cited answer:`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await chatModel.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const is503 = err.message.includes("503") || err.message.includes("overloaded");
      const is429 = err.message.includes("429") || err.message.includes("Too Many Requests") || err.message.includes("quota");

      if ((is503 || is429) && attempt < retries) {
        const waitTime = is429 ? 15000 : 2000; // 429s need a much longer wait than 503s
        console.log(`   ⏳ ${is429 ? "Rate limited" : "Server busy"}, retrying in ${waitTime / 1000}s (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }
}

// STEP E (optional): Translate the final English answer into Hindi.
// This is a deliberately simple, scoped-down multilingual feature - a
// single extra Gemini call after generation, rather than a full Bhashini
// integration. It demonstrates real multilingual capability without the
// added complexity of translating retrieval/embeddings themselves.
// Legal/technical terms (Section numbers, Act names, "TKDL", etc.) are
// kept in English since they don't have standard Hindi equivalents and
// translating them could cause confusion in a legal context.
async function translateToHindi(englishAnswer, retries = 2) {
  const prompt = `Translate the following legal/IP guidance text into clear,
natural Hindi. Keep these items in English/untranslated since they are
proper nouns or standard legal/technical terms with no standard Hindi
equivalent: Act names (e.g. "Patents Act, 1970"), Section numbers (e.g.
"Section 3(p)"), acronyms (TKDL, USPTO, IP, RAG), and citation tags like
"[Source 1]". Translate everything else naturally into Hindi.

TEXT TO TRANSLATE:
${englishAnswer}

Hindi translation:`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await chatModel.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      const isRetryable = err.message.includes("503") || err.message.includes("429");
      if (isRetryable && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        // Translation is a bonus feature - if it fails, we don't want
        // to break the whole response. Return null and let the caller
        // fall back to showing English only.
        console.log("   ⚠️  Hindi translation failed, continuing with English only.");
        return null;
      }
    }
  }
}


// options: { userJurisdiction, userProductType, translateToHindi }
// When userJurisdiction is provided (e.g. from a UI dropdown: "India" or "US"),
// we trust it directly and skip the classification API call entirely.
// When it's missing/empty, we fall back to asking Gemini to classify from
// the question text, same as the original CLI-only behavior.
export async function runRAG(question, options = {}) {
  const { userJurisdiction, userProductType, translateToHindi: wantHindi } = options;

  if (!fs.existsSync(VECTOR_STORE_FILE)) {
    throw new Error(
      "No vector_store.json found. Run 'npm run embed' first."
    );
  }

  const startTime = Date.now();

  const vectorStore = JSON.parse(
    fs.readFileSync(VECTOR_STORE_FILE, "utf-8")
  );

  let classification;
  if (userJurisdiction && userJurisdiction !== "Unclear") {
    // Trust the user's explicit dropdown selection - skip classification
    // API call, just extract a short topic label for display purposes.
    const topic = await extractTopicOnly(question);
    classification = { jurisdiction: userJurisdiction, topic };
  } else {
    // No explicit jurisdiction given - fall back to auto-classification.
    classification = await classifyQuery(question);
  }

  const relevantChunks = await retrieveRelevantChunks(
    question,
    vectorStore,
    classification.jurisdiction
  );

  const answer = await generateAnswer(
    question,
    relevantChunks,
    classification,
    userProductType
  );

  // Hindi translation only runs if explicitly requested - keeps the
  // default (English-only) path fast and avoids an extra API call
  // (and extra rate-limit risk) when the user hasn't asked for it.
  let answerHindi = null;
  if (wantHindi) {
    answerHindi = await translateToHindi(answer);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  return {
    answer,
    answerHindi,
    jurisdiction: classification.jurisdiction,
    topic: classification.topic,
    productType: userProductType || null,
    sources: relevantChunks.map(chunk => ({
      source: chunk.source,
      score: Number(chunk.score.toFixed(3))
    })),
    responseTime: Number(elapsed)
  };
}

async function main() {
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.log('Usage: node ask.js "your question here"');
    return;
  }

  if (!fs.existsSync(VECTOR_STORE_FILE)) {
    console.log("⚠️  No vector_store.json found. Run 'npm run embed' first.");
    return;
  }

  const startTime = Date.now();
  const vectorStore = JSON.parse(fs.readFileSync(VECTOR_STORE_FILE, "utf-8"));

  console.log(`\n❓ Question: ${question}\n`);

  console.log("🔍 Classifying query...");
  const classification = await classifyQuery(question);
  console.log(`   → Jurisdiction: ${classification.jurisdiction}, Topic: ${classification.topic}`);

  console.log("📚 Retrieving relevant sources...");
  const relevantChunks = await retrieveRelevantChunks(question, vectorStore, classification.jurisdiction);
  relevantChunks.forEach((c, i) =>
    console.log(`   ${i + 1}. ${c.source} (similarity: ${c.score.toFixed(3)})`)
  );

  console.log("\n🤖 Generating answer...\n");
  const answer = await generateAnswer(question, relevantChunks, classification);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("─".repeat(60));
  console.log(answer);
  console.log("─".repeat(60));
  console.log(`\n⏱️  Response time: ${elapsed}s`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => console.error("❌ Error:", err.message));
}