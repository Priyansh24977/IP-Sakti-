// embed.js
// PURPOSE: Read our .txt legal documents, chunk them, convert each chunk
// into an "embedding" (a list of numbers representing meaning), and save
// everything into a simple JSON file that acts as our vector database.
//
// Run this ONCE (or whenever you add new documents) with: npm run embed

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// This is Gemini's dedicated embedding model - it turns text into a vector
// (an array of numbers) that captures the MEANING of the text.
// NOTE: "text-embedding-004" was shut down by Google in Jan 2026.
// "gemini-embedding-001" is the current replacement model.
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

const DATA_DIR = "./data";
const OUTPUT_FILE = "./vector_store.json";

// STEP A: Split a long document into smaller chunks.
// Why? Two reasons:
// 1. Embeddings work better on focused chunks of text than huge documents
// 2. When we retrieve later, we want to pull back just the relevant
//    paragraph, not an entire Act's worth of text
function chunkText(text, chunkSize = 500) {
  // Split by paragraphs first (double newline), then group into ~500-word chunks
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).split(" ").length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());

  return chunks;
}

// STEP B: Convert a piece of text into an embedding vector using Gemini
async function getEmbedding(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values; // an array of numbers, e.g. [0.023, -0.11, ...]
}

async function main() {
  console.log("📂 Reading documents from ./data ...");
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".txt"));

  if (files.length === 0) {
    console.log("⚠️  No .txt files found in ./data — add your legal documents there first.");
    return;
  }

  const vectorStore = []; // this will hold { text, source, embedding } objects

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const rawText = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkText(rawText);

    console.log(`📄 ${file} → split into ${chunks.length} chunk(s)`);

    for (const chunk of chunks) {
      console.log(`   🔢 Generating embedding for a chunk...`);
      const embedding = await getEmbedding(chunk);
      vectorStore.push({
        text: chunk,
        source: file,
        embedding: embedding,
      });
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vectorStore, null, 2));
  console.log(`\n✅ Done! Saved ${vectorStore.length} chunks with embeddings to ${OUTPUT_FILE}`);
  console.log(`   This file is your "vector database" for the prototype.`);
}

main().catch(err => console.error("❌ Error:", err.message));
