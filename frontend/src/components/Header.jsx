import { Leaf, ShieldCheck } from "lucide-react";

export default function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Leaf size={20} /></div>
        <div>
          <div className="brand-name">IP-SAKTI SAHAYAK</div>
          <div className="brand-subtitle">Ayurveda IP & Regulatory Guidance</div>
        </div>
      </div>
      <div className="prototype-pill">
        <ShieldCheck size={14} /> MADE BY TEAM SRIJAN
      </div>
    </header>
  );
}
