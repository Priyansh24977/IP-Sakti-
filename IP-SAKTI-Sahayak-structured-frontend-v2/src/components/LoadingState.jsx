import { LoaderCircle } from "lucide-react";

export default function LoadingState() {
  return (
    <div className="card loading">
      <LoaderCircle className="spin" size={24} />
      <div>
        <div className="label">RETRIEVING KNOWLEDGE</div>
        <b>Finding sources and generating a grounded answer…</b>
        <p>This may take a few seconds.</p>
      </div>
    </div>
  );
}
