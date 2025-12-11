// src/pages/Statistics/AdvancedCommunityStats.tsx

import { useEffect, useState } from "react";
import { db } from "../../libs/firebase";
import { collection, getDocs } from "firebase/firestore";

type CommunityStats = {
  modeFocus: {
    blitz: number;
    rapid: number;
    bullet: number;
    daily: number;
    mixed: number;
  };
  avgRatings: {
    blitz: number | null;
    rapid: number | null;
    bullet: number | null;
    daily: number | null;
  };
  activity: {
    active7d: number;
    active30d: number;
    inactive: number;
  };
  diversity: {
    singleMode: number;
    multiMode: number;
    puzzlesUsers: number;
    dailyUsers: number;
  };
};

export default function AdvancedCommunityStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "usuaris"));
      const players = snap.docs.map((d) => d.data());

      // ---------- 1) Distribució de modalitats ----------
      let blitz = 0, rapid = 0, bullet = 0, daily = 0, mixed = 0;

      // ---------- 2) Mitjanes d'Elo ----------
      const blitzArr: number[] = [];
      const rapidArr: number[] = [];
      const bulletArr: number[] = [];
      const dailyArr: number[] = [];

      // ---------- 3) Activitat ----------
      const now = Date.now();
      let active7d = 0, active30d = 0, inactive = 0;

      // ---------- 4) Diversitat ----------
      let singleMode = 0, multiMode = 0, puzzlesUsers = 0, dailyUsers = 0;

      for (const p of players) {
        const st = p.stats ?? null;

        if (!st) continue;

        // ---- modalitats jugades ----
        const modes = [
          st.blitz?.games ?? 0,
          st.rapid?.games ?? 0,
          st.bullet?.games ?? 0,
          st.daily?.games ?? 0,
        ];
        const nonZeroModes = modes.filter((m) => m > 0).length;

        if (nonZeroModes === 1) singleMode++;
        else if (nonZeroModes >= 2) mixed++, multiMode++;

        if (st.blitz?.games) blitz++;
        if (st.rapid?.games) rapid++;
        if (st.bullet?.games) bullet++;
        if (st.daily?.games) daily++;

        // ---- Elo ----
        if (st.blitz?.rating) blitzArr.push(st.blitz.rating);
        if (st.rapid?.rating) rapidArr.push(st.rapid.rating);
        if (st.bullet?.rating) bulletArr.push(st.bullet.rating);
        if (st.daily?.rating) dailyArr.push(st.daily.rating);

        // ---- diversitat ----
        if (st.puzzles?.rating) puzzlesUsers++;
        if (st.daily?.games) dailyUsers++;

        // ---- activitat ----
        const last = p.last_online ? new Date(p.last_online).getTime() : 0;
        if (now - last < 7 * 24 * 3600 * 1000) active7d++;
        else if (now - last < 30 * 24 * 3600 * 1000) active30d++;
        else inactive++;
      }

      const avg = (arr: number[]) =>
        arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

      setStats({
        modeFocus: { blitz, rapid, bullet, daily, mixed },
        avgRatings: {
          blitz: avg(blitzArr),
          rapid: avg(rapidArr),
          bullet: avg(bulletArr),
          daily: avg(dailyArr),
        },
        activity: { active7d, active30d, inactive },
        diversity: { singleMode, multiMode, puzzlesUsers, dailyUsers },
      });
    }

    load();
  }, []);

  if (!stats) return <p>Carregant estadístiques generals…</p>;

  return (
    <div className="stats-grid">
      {/* ---------- MODALITATS ---------- */}
      <div className="stat-card stat-card-primary">
        <div className="stat-card-label">Tipus de jugadors</div>
        <div className="stat-card-sub">
          Blitz jugat per: {stats.modeFocus.blitz}<br />
          Rapid jugat per: {stats.modeFocus.rapid}<br />
          Bullet jugat per: {stats.modeFocus.bullet}<br />
          Daily jugat per: {stats.modeFocus.daily}<br />
          Jugadors "mixtos": {stats.modeFocus.mixed}
        </div>
      </div>

      {/* ---------- ELO MITJÀ ---------- */}
      <div className="stat-card">
        <div className="stat-card-label">Elo Mitjà Blitz</div>
        <div className="stat-card-value">
          {stats.avgRatings.blitz ?? "–"}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-label">Elo Mitjà Rapid</div>
        <div className="stat-card-value">
          {stats.avgRatings.rapid ?? "–"}
        </div>
      </div>

      {/* ---------- ACTIVITAT ---------- */}
      <div className="stat-card">
        <div className="stat-card-label">Activitat Jugadors</div>
        <div className="stat-card-sub">
          Actius 7 dies: {stats.activity.active7d}<br />
          Actius 30 dies: {stats.activity.active30d}<br />
          Inactius: {stats.activity.inactive}
        </div>
      </div>

      {/* ---------- DIVERSITAT ---------- */}
      <div className="stat-card">
        <div className="stat-card-label">Diversitat de joc</div>
        <div className="stat-card-sub">
          Un sol mode de joc: {stats.diversity.singleMode}<br />
          Diversos modes: {stats.diversity.multiMode}<br />
          Usuari de puzzles: {stats.diversity.puzzlesUsers}<br />
          Jugadors de Daily: {stats.diversity.dailyUsers}
        </div>
      </div>
    </div>
  );
}
