import { useState } from "react";
import { askSahayak } from "../services/api";

export function useAskSahayak() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(params) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await askSahayak(params);
      setResult(data);
      return data;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
  }

  return { result, loading, error, ask, reset };
}
