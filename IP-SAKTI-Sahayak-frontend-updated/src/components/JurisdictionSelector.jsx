export default function JurisdictionSelector({ value, onChange }) {
  return (
    <label className="field">
      <span>Jurisdiction</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option>India</option>
        <option>US</option>
      </select>
    </label>
  );
}
