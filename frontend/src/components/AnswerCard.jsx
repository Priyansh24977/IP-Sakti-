import { AlertCircle, Globe2, Languages, Timer } from "lucide-react";

function renderInline(text) {
  const parts = text.split(/(\*\*.*?\*\*|\[Source \d+\])/g);

  return parts.map((part, index) => {
    const sourceMatch = part.match(/^\[Source (\d+)\]$/);

    if (sourceMatch) {
      return (
        <span className="source-tag" key={index}>
          Source {sourceMatch[1]}
        </span>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}

function formatAnswer(answer = "") {
  const lines = answer
    .replace(/^\*\*svg.*?\*\*/i, "")
    .split("\n");

  const elements = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;

    elements.push(
      <ul className="answer-list" key={`bullets-${elements.length}`}>
        {bullets.map((bullet, index) => (
          <li key={index}>{renderInline(bullet)}</li>
        ))}
      </ul>
    );

    bullets = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (!line) {
      flushBullets();
      return;
    }

    if (line.startsWith("* ") || line.startsWith("- ")) {
      bullets.push(line.slice(2));
      return;
    }

    flushBullets();

    const heading = line.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      elements.push(
        <h3 key={`heading-${index}`}>{renderInline(heading[1])}</h3>
      );
      return;
    }

    const numberedHeading = line.match(/^\d+\.\s+(.*)$/);
    if (numberedHeading) {
      elements.push(
        <h3 key={`numbered-${index}`}>{renderInline(line)}</h3>
      );
      return;
    }

    elements.push(
      <p key={`paragraph-${index}`}>{renderInline(line)}</p>
    );
  });

  flushBullets();
  return elements;
}

export default function AnswerCard({ result }) {
  const jurisdiction = result?.jurisdiction || "Unclear";

  return (
    <article className="card answer">
      <div className="result-top">
        <div>
          <div className="label">02 · AI RESPONSE</div>
          <h2>Grounded answer</h2>
        </div>

        <span className="jur">
          <Globe2 size={14} />
          {jurisdiction}
        </span>
      </div>

      <div className="answer-text">
        {formatAnswer(result?.answer)}
      </div>

      {result?.translatedAnswer && result.translatedAnswer !== result.answer && (
        <div className="translated-answer">
          <div className="translated-heading"><Languages size={14} /> Translated response · {result.outputLanguage || "Selected language"}</div>
          <div className="answer-text">{formatAnswer(result.translatedAnswer)}</div>
        </div>
      )}

      <div className="answer-meta">
        <span><Globe2 size={12} /> {result?.jurisdiction || "Unclear"}</span>
        <span><Languages size={12} /> {result?.inputLanguage || "English"} → {result?.outputLanguage || "English"}</span>
        {result?.responseTime != null && <span><Timer size={12} /> {result.responseTime}s</span>}
      </div>

      <div className="topic">
        Detected topic: <b>{result?.topic || "general"}</b>
      </div>

      <div className="disclaimer">
        <AlertCircle size={15} />
        This information is for guidance only and does not constitute legal
        advice.
      </div>
    </article>
  );
}
