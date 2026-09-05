export async function askSahayak({
  question,
  productType,
  jurisdiction,
  translateToHindi = false,
}) {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: question.trim(),
      jurisdiction,
      productType,
      translateToHindi,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Unable to get an answer.");
  }

  return data;
}