import { translateWithBhashini } from "./bhashini.js";

try {
  const result = await translateWithBhashini(
    "Can traditional Ayurvedic knowledge be patented in India?",
    "English",
    "Hindi"
  );

  console.log("\nTranslation:");
  console.log(result);

} catch (error) {
  console.error("\nBhashini test failed:");
  console.error(error.message);
}