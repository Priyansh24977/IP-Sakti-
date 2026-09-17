import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Header from "../components/Header";

export default function ConsultationDetails() {
  const { id } = useParams();

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchConsultation();
  }, [id]);

  async function fetchConsultation() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please login to view this consultation.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(error);
      setError("Consultation not found.");
    } else {
      setConsultation(data);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="consultations-page">
        <div className="consultations-container">
          <p>Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="consultations-page">
        <div className="consultations-container">
          <p className="auth-error">
            {error || "Consultation not found."}
          </p>

          <Link to="/consultations" className="new-consultation-button">
            Back to Consultations
          </Link>
        </div>
      </div>
    );
  }

 return (
  <>
    <Header />

    <div className="consultations-page">
      <div className="consultations-container">

        <Link
          to="/consultations"
          className="back-consultations"
        >
          ← Back to My Consultations
        </Link>

        <div className="details-header">
          <span className="consultation-label">
            CONSULTATION
          </span>

          <h1>Research Consultation</h1>

          <p>
            {new Date(
              consultation.created_at
            ).toLocaleString()}
          </p>
        </div>

        {/* QUESTION */}
        <section className="details-section">
          <span className="consultation-label">
            QUESTION
          </span>

          <div className="question-box">
            {consultation.question}
          </div>
        </section>

        {/* METADATA */}
        <section className="details-meta">
          <div>
            <span>JURISDICTION</span>
            <strong>
              {consultation.jurisdiction || "—"}
            </strong>
          </div>

          <div>
            <span>PRODUCT / FORMULATION</span>
            <strong>
              {consultation.product_type || "—"}
            </strong>
          </div>

          <div>
            <span>INPUT LANGUAGE</span>
            <strong>
              {consultation.input_language || "—"}
            </strong>
          </div>

          <div>
            <span>OUTPUT LANGUAGE</span>
            <strong>
              {consultation.output_language || "—"}
            </strong>
          </div>
        </section>

        {/* ANSWER */}
        <section className="details-section">
          <span className="consultation-label">
            ANSWER
          </span>

          <div className="full-answer">
            {consultation.answer}
          </div>
        </section>

        {/* SOURCES */}
        <section className="details-section">
          <span className="consultation-label">
            RETRIEVED SOURCES
          </span>

          {consultation.sources &&
          consultation.sources.length > 0 ? (
            <div className="source-list">
              {consultation.sources.map((source, index) => (
                <div
                  className="source-item"
                  key={index}
                >
                  <div>
                    <strong>
                      {source.source}
                    </strong>
                  </div>

                  {source.score !== undefined && (
                    <span>
                      Similarity: {source.score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-sources">
              No source information available.
            </p>
          )}
        </section>

      </div>
    </div>
  </>
);
}