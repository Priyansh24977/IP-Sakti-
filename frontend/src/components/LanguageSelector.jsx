export default function LanguageSelector({ value, onChange, label = "Language" }) {
  const languages = [
    "English", "Hindi", "Tamil", "Telugu", "Bengali", "Marathi",
    "Gujarati", "Kannada", "Malayalam", "Punjabi", "Odia", "Assamese"
  ];

  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {languages.map((language) => (
          <option key={language}>{language}</option>
        ))}
      </select>
    </label>
  );
}
