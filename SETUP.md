# IP-SAKTI Sahayak UI

Copy the `frontend` folder into your existing `ip-sakti-prototype` project.

From the project root:
1. `cd frontend`
2. `npm install`
3. `npm run dev`

Keep the backend running on port 5000:
`npm run server`

Then open the Vite URL, normally `http://localhost:5173`.

The frontend expects `POST /api/ask` to return:
`answer`, `jurisdiction`, `topic`, and `sources`.
