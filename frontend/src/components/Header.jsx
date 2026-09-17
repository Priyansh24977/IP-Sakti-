import { Leaf, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current logged-in user
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    getUser();

    // Keep user state updated
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      return;
    }

    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">

      <div className="brand">
        <div className="brand-mark">
          <Leaf size={18} />
        </div>

        <div>
          <div className="brand-name">
            IP-SAKTI SAHAYAK
          </div>

          <div className="brand-subtitle">
            Ayurveda · Intellectual Property · Regulation
          </div>
        </div>
      </div>

      <div className="header-right">

        <div className="prototype-pill">
          RESEARCH PROTOTYPE · TEAM SRIJAN
        </div>

        {user && (
          <div className="user-section">

            <span className="user-email">
              {user.email}
            </span>

            <button
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>

          </div>
        )}

      </div>

    </header>
  );
}