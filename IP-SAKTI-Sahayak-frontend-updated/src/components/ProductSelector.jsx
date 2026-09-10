export default function ProductSelector({ value, onChange, options }) {
  return (
    <label className="field">
      <span>Product / formulation</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
