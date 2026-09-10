import { ArrowUp, AlertCircle, LoaderCircle, MessageSquareText } from "lucide-react";
import ProductSelector from "./ProductSelector";
import JurisdictionSelector from "./JurisdictionSelector";

export default function QueryForm({
  productType,
  setProductType,
  jurisdiction,
  setJurisdiction,
  question,
  setQuestion,
  loading,
  error,
  onSubmit,
  productOptions,
}) {
  return (
    <form className="card query" onSubmit={onSubmit}>
      <div className="label">01 · QUERY CONTEXT</div>
      <h2>Tell Sahayak what you’re working on</h2>

      <div className="fields">
        <ProductSelector value={productType} onChange={setProductType} options={productOptions} />
        <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} />
      </div>

      <label className="field question-field">
        <span>Your question</span>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Can I patent an Ashwagandha formulation?"
          rows={5}
        />
      </label>

      <div className="form-bottom">
        <span className="hint"><MessageSquareText size={14} /> Grounded in retrieved sources.</span>
        <button className="ask-button" disabled={loading}>
          {loading ? <LoaderCircle className="spin" size={17} /> : <ArrowUp size={17} />}
          {loading ? "Thinking…" : "Ask Sahayak"}
        </button>
      </div>

      {error && <div className="error"><AlertCircle size={16} />{error}</div>}
    </form>
  );
}
