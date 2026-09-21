🌿 IP-SAKTI Sahayak

Multilingual, RAG-Based AI Assistant for Intellectual Property & Regulatory Guidance in Ayurveda

Smart India Hackathon 2026 | Problem Statement ID: 26045

IP-SAKTI Sahayak is an AI-powered prototype for providing source-cited
Intellectual Property (IP) and regulatory guidance for Ayurveda. It
combines a multilingual interface, jurisdiction-aware query processing,
Retrieval-Augmented Generation (RAG), semantic similarity, safe
abstention, authentication, and consultation history.

Vision: Make Ayurveda IP and regulatory guidance accessible,
multilingual, evidence-grounded, and easier to understand.

🔗 Links

🚀 Live Demo: https://ip-sakti-drab.vercel.app/

💻 GitHub: https://github.com/Priyansh24977/IP-Sakti

🎯 Problem

Ayurveda involves traditional knowledge, formulations, biological
resources, research, and commercialization. Protecting and using this
knowledge may involve multiple overlapping frameworks, including:

Patents

Geographical Indications (GI)

Trademarks

Copyright

Designs

Traditional Knowledge

Biological Diversity

Access and Benefit Sharing (ABS)

National and international IP regulations

Relevant information is distributed across different legal and
regulatory sources. Practitioners, researchers, AYUSH startups, and
MSMEs may therefore find it difficult to identify the requirements
applicable to a particular product, formulation, jurisdiction, or use
case.

💡 Solution

IP-SAKTI Sahayak provides a single AI-assisted interface for
Ayurveda-related IP and regulatory questions.

The prototype:

Understands the user's query and intent.

Considers product/formulation and jurisdiction context.

Retrieves relevant evidence from a curated knowledge base.

Uses embeddings and cosine similarity for semantic retrieval.

Applies a 0.60 similarity threshold.

Generates a grounded response from relevant evidence.

Provides source citations.

Supports input and output language preferences.

Stores authenticated consultations.

Uses safe abstention when sufficient relevant evidence is
unavailable.

✨ Key Features

🌿 Ayurveda-Specific AI

Focused on Ayurveda-related IP and regulatory guidance rather than
acting as a generic chatbot.

🔎 Retrieval-Augmented Generation

Retrieves relevant evidence before generating an answer to improve
grounding.

📚 Source-Cited Responses

Provides retrieved sources with answers so users can verify the
information.

🌍 Jurisdiction Awareness

Supports jurisdiction context such as India and USA.

🧪 Product / Formulation Context

Allows the query to include the relevant product or formulation context.

🗣️ Multilingual Interaction

Supports language selection for input and output.

🛡️ Evidence-Based Safe Abstention

The prototype uses a similarity threshold of 0.60:

Similarity >= 0.60
        ↓
Relevant Evidence
        ↓
Grounded Answer

If sufficient evidence is not found:

Similarity < 0.60
        ↓
Insufficient Relevant Evidence
        ↓
Safe Abstention

🔐 Authentication

User authentication is handled through Supabase Authentication.

🗂️ Consultation History

Authenticated users can review their previous consultations.

🏗️ System Architecture

                         USER
                           │
                           ▼
                 ┌──────────────────┐
                 │  React Frontend  │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Node.js / Express│
                 │     REST API     │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Query Processing │
                 │ • Intent         │
                 │ • Topic          │
                 │ • Product        │
                 │ • Jurisdiction   │
                 │ • Language       │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  RAG Retrieval   │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ Embeddings +     │
                 │ Cosine Similarity│
                 └────────┬─────────┘
                          │
                    Threshold 0.60
                          │
                    ┌─────┴─────┐
                    │           │
                   YES          NO
                    │           │
                    ▼           ▼
             Relevant       Safe
             Evidence       Abstention
                    │
                    ▼
             Top Evidence Chunks
                    │
                    ▼
                Gemini / LLM
                    │
                    ▼
             Grounded Answer
                    │
                    ▼
              Source Citations
                    │
                    ▼
             Output Translation
                    │
                    ▼
                   USER

🧠 RAG Pipeline

Official / Curated Sources
          ↓
     Text Extraction
          ↓
        Cleaning
          ↓
       Chunking
          ↓
 Metadata + Source Information
          ↓
      Embeddings
          ↓
      Vector Store
          ↓
      User Query
          ↓
   Query Understanding
          ↓
 Product + Jurisdiction
          ↓
 Semantic Retrieval
          ↓
 Cosine Similarity
          ↓
 Threshold Check (0.60)
          ↓
 Relevant Evidence?
      ↙           ↘
    YES            NO
     ↓              ↓
 Top Chunks     Safe Abstention
     ↓
 Gemini / LLM
     ↓
 Cited Answer
     ↓
 Translation

🛠️ Technology Stack

Frontend

React

Vite

CSS / Tailwind CSS

Lucide React

Backend

Node.js

Express.js

REST API

CORS

dotenv

AI / RAG

Google Gemini

Gemini Embeddings

Retrieval-Augmented Generation

Cosine Similarity

LLM-based query understanding

Database & Authentication

Supabase

Supabase Authentication

PostgreSQL

Consultation storage

Knowledge Sources

The prototype can use curated authoritative material such as:

India Code

IP India

Patents Act and related rules

Traditional Knowledge Digital Library (TKDL)

National Biodiversity Authority (NBA)

Access and Benefit Sharing (ABS) resources

WIPO resources

USPTO resources

Relevant patent records and case studies

📂 Project Structure

IP-SAKTI/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── lib/
│   │   └── api/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── server.js
│   ├── ask.js
│   ├── embed.js
│   ├── authMiddleware.js
│   ├── vector_store.json
│   └── package.json
│
└── README.md

The exact folder structure may vary with the current deployment
arrangement.

🔐 Authentication Flow

Register / Login
       ↓
Supabase Authentication
       ↓
Authenticated Session
       ↓
Access Token
       ↓
Frontend API Request
       ↓
Authorization: Bearer <token>
       ↓
Backend Authentication Middleware
       ↓
Protected /api/ask

🔄 Query Processing

User Question
     ↓
Input Language
     ↓
Intent / Topic Understanding
     ↓
Product Type + Jurisdiction
     ↓
Knowledge Retrieval
     ↓
Embedding Similarity
     ↓
Threshold = 0.60
     ↓
Relevant Evidence?
     ├── YES → Grounded Answer → Citations
     └── NO  → Safe Abstention
                         ↓
                 Save Consultation

📡 API Documentation

Health Check

GET /api/health

Example:

{
  "ok": true,
  "service": "IP-SAKTI Sahayak API"
}

Ask Sahayak

POST /api/ask

Headers

Content-Type: application/json
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>

Request Body

{
  "question": "Can traditional Ayurvedic knowledge be patented in India?",
  "productType": "Classical",
  "jurisdiction": "India",
  "inputLanguage": "English",
  "outputLanguage": "English"
}

Parameters

Parameter          Description

question         User's IP / regulatory question
productType      Product or formulation context
jurisdiction     Selected legal jurisdiction
inputLanguage    Language of the input query
outputLanguage   Desired response language

🗄️ Consultation Storage

After a successful response, the backend stores the consultation in
Supabase.

Stored information can include:

User ID

Question

Answer

Jurisdiction

Product type

Input language

Output language

Sources

This enables authenticated users to review previous consultations.

🧪 Prototype Demonstration

The prototype demonstrates:

1. English → English

An Ayurveda IP question is asked in English and answered in English.

2. English → Hindi

A question is asked in English and the response is requested in Hindi.

3. Different Jurisdiction

The jurisdiction is changed, for example from India to USA, to
demonstrate jurisdiction-aware processing.

4. Irrelevant Question

An unrelated question demonstrates safe abstention when relevant
evidence is unavailable or insufficient.

5. Consultation History

Generated consultations are stored and displayed in My
Consultations.

6. Logout

The user can securely log out.

📊 Example Query

Question:
Can traditional Ayurvedic knowledge be patented in India?

Product Type:
Classical

Jurisdiction:
India

Input Language:
English

Output Language:
English

The system retrieves relevant evidence, evaluates similarity, and
generates a source-grounded response when sufficient evidence is
available.

👥 Target Users

🌿 Ayurveda Practitioners

🌱 Cultivators

🔬 Researchers

🚀 AYUSH Startups

🏢 MSMEs

🏛️ Government / AYUSH Departments

📚 Users researching Ayurveda-related IP and regulatory requirements

🌍 Impact

Social

Improves access to IP and regulatory information.

Supports multilingual interaction.

Helps users understand traditional knowledge protection.

Economic

Enables earlier IP screening.

Can reduce unnecessary consultations and filing-related costs.

Supports commercialization pathways for genuinely novel Ayurvedic
innovations.

Regulatory & Governance

Supports better classification and traceability.

Improves awareness of anti-biopiracy measures.

Provides guidance related to Access and Benefit Sharing.

Makes responses auditable through source citations.

🔒 Security

The prototype incorporates:

Supabase Authentication

Protected backend API routes

Bearer-token based authentication

Server-side secret keys

CORS configuration

User-specific consultation storage

Important

Never expose SUPABASE_SECRET_KEY in frontend code or commit it to
GitHub.

⚙️ Environment Variables

Backend .env

PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
GEMINI_API_KEY=your_gemini_api_key

Frontend .env

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

Never commit .env files containing secrets.

🚀 Local Installation

1. Clone

git clone https://github.com/Priyansh24977/IP-Sakti.git
cd IP-Sakti

2. Install Dependencies

If frontend and backend are separate:

cd frontend
npm install

cd ../backend
npm install

If the current prototype uses one package configuration:

npm install

▶️ Run Backend

npm run server

Backend:

http://localhost:5000

Health check:

http://localhost:5000/api/health

▶️ Run Frontend

npm run dev

Frontend:

http://localhost:5173

🧠 Embedding Pipeline

If the project uses the embedding script:

npm run embed

To test the RAG query pipeline:

npm run ask

The embedding step prepares the vector-store data used during semantic
retrieval.

☁️ Deployment

Frontend

The frontend can be deployed on Vercel.

Configure the required frontend environment variables in the Vercel
project settings.

Backend

The Express backend can be deployed on a Node.js-compatible hosting
service.

Configure these server-side variables:

PORT
SUPABASE_URL
SUPABASE_SECRET_KEY
GEMINI_API_KEY

The frontend API URL must point to the deployed backend.

🧭 Complete User Workflow

REGISTER / LOGIN
       ↓
Authentication
       ↓
Sahayak Dashboard
       ↓
Select Product Type
       ↓
Select Jurisdiction
       ↓
Enter Question
       ↓
Select Input / Output Language
       ↓
ASK SAHAYAK
       ↓
Backend Authentication
       ↓
Query Understanding
       ↓
RAG Retrieval
       ↓
Similarity Threshold
       ↓
Relevant Evidence?
       ├───────────────┐
       │ YES           │ NO
       ↓               ↓
Grounded Answer    Safe Abstention
       ↓
Source Citations
       ↓
Save Consultation
       ↓
My Consultations
       ↓
Logout

📌 Current Prototype Scope

User authentication

Ayurveda-focused IP query interface

Product/formulation context

India / USA jurisdiction context

RAG-based retrieval

Embeddings

Cosine similarity

0.60 evidence threshold

Grounded AI responses

Source citations

Multilingual input/output workflow

Consultation history

Secure logout

Safe abstention for insufficient evidence

🔮 Future Scope

🌐 Additional international jurisdictions

🇮🇳 More Indian languages

📚 Larger curated legal knowledge base

🔎 Advanced patent and prior-art search

📑 Automated document and patent analysis

📝 Patent / GI / trademark application assistance

🧬 Expanded biodiversity and ABS guidance

🏛️ Integration with additional official databases

🧠 Advanced retrieval and reranking

👨‍⚖️ Expert / legal professional integration

📊 Analytics and administrative dashboards

🔐 Advanced audit and access-control mechanisms

⚠️ Disclaimer

IP-SAKTI Sahayak is an AI-assisted information and guidance
prototype.

It is not a substitute for professional legal advice, a patent
attorney, regulatory authority, or other qualified professional.

For important legal, IP, regulatory, or commercial decisions, users
should verify the cited information using authoritative sources and
consult an appropriate professional where necessary.

👨‍💻 Team Members

Member

Priyansh Dwivedi
Tarunendra Singh
Sameeksha Rajput
Krishna Arjariya
Raman Pawar
Mohit Patidar

🏆 Smart India Hackathon 2026

Problem Statement ID: 26045
Project: IP-SAKTI Sahayak
Category: Software
Domain: Intellectual Property / Ayurveda / AI

⭐ Project Vision

Making Ayurveda IP and regulatory guidance accessible, multilingual,
evidence-based, and source-grounded through AI.

📜 License

This project is a prototype developed for Smart India Hackathon
2026.

Add an appropriate open-source license if the repository is intended to
be publicly licensed.
