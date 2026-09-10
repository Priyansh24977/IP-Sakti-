# IP-SAKTI Sahayak Frontend

React + Vite frontend for the IP-SAKTI Sahayak RAG prototype.

## Run

From this folder:

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the backend at `http://localhost:5000`.

## Backend

Start the backend from the project root:

```bash
npm run server
```

## Updated frontend flow

- Sends product type and jurisdiction as structured API fields.
- Sends input and output language separately.
- Displays grounded English answer and translated answer when different.
- Displays jurisdiction, language pair, topic and response time.
- Shows retrieved sources and similarity scores.
