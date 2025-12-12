import "./CommunityStats.css";

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { db } from "../../libs/firebase.ts";
import { collection, getDocs } from "firebase/firestore";

import GlobalInsightsSection from "./Sections/GlobalInsightsSection";


// Importem les seccions modulars
import OverviewSection from "./Sections/OverviewSection";
import RankingsSection from "./Sections/RankingsSection";
import LocationsSection from "./Sections/LocationsSection";
import GlobalOpeningsSection from "./Sections/GlobalOpeningsSection.tsx";

type CommunityStatus = "loading" | "ready" | "error";

export default function CommunityStats() {
  const [players, setPlayers] = useState<any[]>([]);
  const [status, setStatus] = useState<CommunityStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommunity() {
      try {
        setStatus("loading");
        const snap = await getDocs(collection(db, "usuaris"));

        const list: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPlayers(list);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        setError("No s'han pogut carregar les dades.");
        setStatus("error");
      }
    }

    loadCommunity();
  }, []);

  return (
    <div className="page">
      <div className="homepage">
        <header className="homepage-header">
          <div className="header-left">
            <div className="logo-circle">logo</div>
            <span className="brand">ChessStats</span>
          </div>

          <Link to="/" className="back-link">← Tornar</Link>
        </header>

        <main className="homepage-main">
          {status === "loading" && <p>Carregant…</p>}
          {status === "error" && <p style={{ color: "red" }}>{error}</p>}

          {status === "ready" && (
            <div className="community-page">

              {/* Títol principal */}
              <h2 className="community-title">Estadístiques de la comunitat</h2>

              {/* ───────────────────────────────────── */}
              {/*   RESUM GENERAL                     */}
              {/* ───────────────────────────────────── */}
              <h3 className="section-title">📊 Resum General</h3>
              <OverviewSection players={players} />

              <div className="section-divider" />

              {/* ───────────────────────────────────── */}
              {/*   RÀNQUINGS                          */}
              {/* ───────────────────────────────────── */}
              <h3 className="section-title">🏆 Rànquings per modalitat</h3>
              <RankingsSection players={players} />

              <div className="section-divider" />

              {/* ───────────────────────────────────── */}
              {/*   LOCALITZACIONS                     */}
              {/* ───────────────────────────────────── */}
              <h3 className="section-title">🌍 Localitzacions dels jugadors</h3>
              <LocationsSection players={players} />

              <div className="section-divider" />

              <h3 className="section-title">♟️ Obertures globals</h3>
              <GlobalOpeningsSection />
              <div className="section-divider" />

              <h3 className="section-title">📈 Global Insights</h3>
              <GlobalInsightsSection />
              <div className="section-divider" />

            </div>
          )}
        </main>

      </div>
    </div>
  );
}
