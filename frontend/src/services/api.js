import { supabase } from "../lib/supabase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function askSahayak({
  question,
  productType,
  jurisdiction,
  inputLanguage = "English",
  outputLanguage = "English",
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Please login to use IP-SAKTI Sahayak.");
  }

  const response = await fetch(
    `${API_URL}/api/ask`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },

      body: JSON.stringify({
        question: question.trim(),
        productType,
        jurisdiction,
        inputLanguage,
        outputLanguage,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to get an answer."
    );
  }

  return data;
}