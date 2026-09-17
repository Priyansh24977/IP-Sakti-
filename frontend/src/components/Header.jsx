import { Leaf } from 'lucide-react';

export default function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Leaf size={18} /></div>
        <div>
          <div className="brand-name">IP-SAKTI SAHAYAK</div>
          <div className="brand-subtitle">Ayurveda · Intellectual Property · Regulation</div>
        </div>
      </div>
      <div className="prototype-pill">RESEARCH PROTOTYPE · TEAM SRIJAN</div>
    </header>
  );
}
