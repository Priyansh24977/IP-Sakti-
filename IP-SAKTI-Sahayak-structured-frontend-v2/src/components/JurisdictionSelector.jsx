import { JURISDICTIONS } from "../constants/options";

export default function JurisdictionSelector({ value, onChange }) {
  return (
    <label className="field">
      <span>Jurisdiction</span>
      <div className="jurisdiction-group">
        {JURISDICTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`jurisdiction-btn${value === option ? " active" : ""}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </label>
  );
}