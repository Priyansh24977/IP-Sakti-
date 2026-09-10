import { ArrowUp } from "lucide-react";

export default function DemoQuestions({ questions, onSelect }) {
  return (
    <aside className="card examples">
      <div className="label">TRY A DEMO QUESTION</div>
      <h2>See it in action</h2>
      {questions.map((question) => (
        <button className="example" key={question} onClick={() => onSelect(question)}>
          <span>{question}</span><ArrowUp size={15} />
        </button>
      ))}
    </aside>
  );
}
