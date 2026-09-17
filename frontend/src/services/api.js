export async function askSahayak({
  question,
  productType,
  jurisdiction,
  inputLanguage = "English",
  outputLanguage = "English",
}) {
  const response = await fetch(
    "https://ip-sakti-t75m.onrender.com/api/ask",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    throw new Error(data.error || "Unable to get an answer.");
  }

  return data;
}