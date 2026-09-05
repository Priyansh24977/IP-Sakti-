import { BookOpen, ShieldCheck } from "lucide-react";

export default function SourcesCard({ sources = [] }) {
  return (
    <aside className="card sources">
      <div className="label">03 · EVIDENCE</div>
      <h2>Sources used</h2>
      <p>Retrieved knowledge supporting this response.</p>

      {sources.map((source, index) => (
        <div className="source" key={`${source.source}-${index}`}>
          <BookOpen size={17} />
          <div>
            <b>Source {index + 1}</b>
            <span>{source.source}</span>
          </div>
          <strong>{Number(source.score).toFixed(3)}</strong>
        </div>
      ))}

      <div className="trust">
        <ShieldCheck size={15} />
        RAG retrieves relevant source passages before generation.
      </div>
    </aside>
  );
}
