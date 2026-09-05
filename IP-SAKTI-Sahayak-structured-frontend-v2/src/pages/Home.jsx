import { useState } from "react";
import Header from "../components/Header";
import Hero from "../components/Hero";
import QueryForm from "../components/QueryForm";
import DemoQuestions from "../components/DemoQuestions";
import AnswerCard from "../components/AnswerCard";
import SourcesCard from "../components/SourcesCard";
import LoadingState from "../components/LoadingState";
import HowItWorks from "../components/HowItWorks";
import { useAskSahayak } from "../hooks/useAskSahayak";
import { PRODUCT_OPTIONS, DEMO_QUESTIONS } from "../constants/options";

export default function Home() {
  const [productType, setProductType] = useState("Proprietary Product");
  const [jurisdiction, setJurisdiction] = useState("India");
  const [question, setQuestion] = useState("");
  const [showHindi, setShowHindi] = useState(false);
  const { result, loading, error, ask } = useAskSahayak();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!question.trim()) return;

    await ask({
      question,
      productType,
      jurisdiction,
      translateToHindi: showHindi,
    });
  }

  return (
    <div className="app">
      <Header />

      <main className="page">
        <Hero />

        <section className="workspace">
          <QueryForm
            productType={productType}
            setProductType={setProductType}
            jurisdiction={jurisdiction}
            setJurisdiction={setJurisdiction}
            question={question}
            setQuestion={setQuestion}
            showHindi={showHindi}
            setShowHindi={setShowHindi}
            loading={loading}
            error={error}
            onSubmit={handleSubmit}
            productOptions={PRODUCT_OPTIONS}
          />
          <DemoQuestions questions={DEMO_QUESTIONS} onSelect={setQuestion} />
        </section>

        {loading && <LoadingState />}

        {result && !loading && (
          <section className="results">
            <AnswerCard result={result} />
            <SourcesCard sources={result.sources} />
          </section>
        )}

        {!result && !loading && <HowItWorks />}
      </main>

      <footer>
        <span>IP-SAKTI Sahayak · Prototype</span>
        <span>Source-cited Ayurveda IP guidance</span>
      </footer>
    </div>
  );
}
