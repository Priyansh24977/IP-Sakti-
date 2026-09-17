import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Header from "../components/Header";

export default function Consultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchConsultations();
  }, []);

  async function fetchConsultations() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please login to view your consultations.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Unable to load consultations.");
    } else {
      setConsultations(data || []);
    }

    setLoading(false);
  }

  async function handleDelete(id) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this consultation?"
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("consultations")
    .delete()
    .eq("id", id);

    if (error) {
      console.error(error);
      setError("Unable to delete consultation.");
      return;
    }

    setConsultations((prev) => prev.filter((item) => item.id !== id));
  }

  if (loading) {
    return (
      <div className="consultations-page">
        <div className="consultations-container">
          <p>Loading consultations...</p>
        </div>
      </div>
    );
  }

  return (
  <>
    <Header />
    <div className="consultations-page">
      <div className="consultations-container">
        <div className="consultations-header">
          <div>
            <h1>My Consultations</h1>
            <p>Your previous IP and regulatory research queries.</p>
          </div>

          <Link to="/" className="new-consultation-button">
            New Consultation
          </Link>
        </div>

        {error && <p className="auth-error">{error}</p>}

        {consultations.length === 0 ? (
          <div className="empty-consultations">
            <h2>No consultations yet</h2>
            <p>Your completed consultations will appear here.</p>

            <Link to="/" className="new-consultation-button">
              Start a Consultation
            </Link>
          </div>
        ) : (
          <div className="consultation-list">
            {consultations.map((consultation) => (
              <div key={consultation.id} className="consultation-card">
                <div className="consultation-card-top">
                  <div>
                    <span className="consultation-label">QUESTION</span>

                    <h2>{consultation.question}</h2>
                  </div>

                  <button
                    className="delete-consultation"
                    onClick={() => handleDelete(consultation.id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="consultation-meta">
                  <span>Jurisdiction: {consultation.jurisdiction || "—"}</span>

                  <span>Product: {consultation.product_type || "—"}</span>

                  <span>
                    {new Date(consultation.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="consultation-card-footer">
                  <Link
                    to={`/consultations/${consultation.id}`}
                    className="view-consultation"
                  >
                    View Consultation →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </>
);
}
