import "./CommunityStats.css";

import { useEffect, useState } from "react";
// import { Link } from "react-router-dom"; // Removed unused Link

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
    <>
      {status === "loading" && <p>Carregant…</p>}
      {status === "error" && <p style={{ color: "red" }}>{error}</p>}

      {status === "ready" && (
        <div className="community-page">

          {/* Títol principal */}
          <div className="animate-fade-in" style={{ animationDelay: "0s" }}>
            <h2 className="community-title">Estadístiques de la comunitat</h2>
          </div>

          {/* ───────────────────────────────────── */}
          {/*   RESUM GENERAL                     */}
          {/* ───────────────────────────────────── */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h3 className="section-title">Resum General</h3>
            <OverviewSection players={players} />
          </div>

          <div className="section-divider animate-fade-in" style={{ animationDelay: "0.2s" }} />

          {/* ───────────────────────────────────── */}
          {/*   RÀNQUINGS                          */}
          {/* ───────────────────────────────────── */}
          <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h3 className="section-title">Rànquings per modalitat</h3>
            <RankingsSection players={players} />
          </div>

          <div className="section-divider animate-fade-in" style={{ animationDelay: "0.4s" }} />

          {/* ───────────────────────────────────── */}
          {/*   LOCALITZACIONS                     */}
          {/* ───────────────────────────────────── */}
          <div className="animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <h3 className="section-title">Localitzacions dels jugadors</h3>
            <LocationsSection players={players} />
          </div>

          <div className="section-divider animate-fade-in" style={{ animationDelay: "0.6s" }} />

          <div className="animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <h3 className="section-title">Obertures globals</h3>
            <GlobalOpeningsSection />
          </div>
          <div className="section-divider animate-fade-in" style={{ animationDelay: "0.8s" }} />

          <div className="animate-fade-in" style={{ animationDelay: "0.9s" }}>
            <h3 className="section-title">Global Insights</h3>
            <GlobalInsightsSection />
          </div>
          <div className="section-divider animate-fade-in" style={{ animationDelay: "1.0s" }} />

        </div>
      )}
    </>
  );
}
