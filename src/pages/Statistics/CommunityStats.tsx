// src/pages/Statistics/CommunityStats.tsx
import "./CommunityStats.css";

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";

import { db } from "../../libs/firebase.ts";
import { collection, getDocs } from "firebase/firestore";

import type { Player, PlayerStats } from "../Home/HomePage.tsx";

type CommunityStatus = "loading" | "ready" | "error";

type CommunityPlayer = Player & {
  stats?: PlayerStats;
  // Per si en un futur vols guardar més coses (visites, etc.)
};

type RatingMode = "rapid" | "blitz" | "bullet" | "daily" | "daily960" | "puzzles";

type TopPlayerRow = {
  username: string;
  avatar?: string;
  rating: number;
  games?: number;
};

type AggregatedStats = {
  totalPlayers: number;
  withStats: number;
  avgRapidRating: number | null;
  avgBlitzRating: number | null;
  avgBulletRating: number | null;
  avgDailyRating: number | null;
  avgPuzzlesRating: number | null;
  totalGamesRapid: number;
  totalGamesBlitz: number;
  totalGamesBullet: number;
  totalGamesDaily: number;
};

type LocationRow = {
  location: string;
  count: number;
};

function CommunityStats() {
  const [players, setPlayers] = useState<CommunityPlayer[]>([]);
  const [status, setStatus] = useState<CommunityStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommunity() {
      try {
        setStatus("loading");
        setError(null);

        const usuarisRef = collection(db, "usuaris");
        const snap = await getDocs(usuarisRef);

        const loaded: CommunityPlayer[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as any;

          const stats: PlayerStats | undefined = data.stats ?? undefined;

          const player: CommunityPlayer = {
            avatar: data.avatar ?? "",
            followers: data.followers ?? 0,
            id: data.id ?? 0,
            is_streamer: data.is_streamer ?? false,
            joined: typeof data.joined === "string" ? data.joined : "",
            last_online:
              typeof data.last_online === "string" ? data.last_online : "",
            location: data.location ?? "",
            name: data.name ?? "",
            status: data.status ?? "",
            twitch_url: data.twitch_url ?? "",
            username: data.username ?? docSnap.id,
            stats,
          };

          return player;
        });

        setPlayers(loaded);
        setStatus("ready");
      } catch (err) {
        console.error("Error carregant comunitat:", err);
        setError("No s'han pogut carregar les estadístiques de la comunitat.");
        setStatus("error");
      }
    }

    loadCommunity();
  }, []);

  // ============== AGREGACIÓ DE DADES ==============

  const aggregated: AggregatedStats = useMemo(() => {
    if (!players.length) {
      return {
        totalPlayers: 0,
        withStats: 0,
        avgRapidRating: null,
        avgBlitzRating: null,
        avgBulletRating: null,
        avgDailyRating: null,
        avgPuzzlesRating: null,
        totalGamesRapid: 0,
        totalGamesBlitz: 0,
        totalGamesBullet: 0,
        totalGamesDaily: 0,
      };
    }

    let withStats = 0;

    let rapidSum = 0;
    let rapidCount = 0;
    let blitzSum = 0;
    let blitzCount = 0;
    let bulletSum = 0;
    let bulletCount = 0;
    let dailySum = 0;
    let dailyCount = 0;
    let puzzlesSum = 0;
    let puzzlesCount = 0;

    let totalGamesRapid = 0;
    let totalGamesBlitz = 0;
    let totalGamesBullet = 0;
    let totalGamesDaily = 0;

    for (const p of players) {
      if (p.stats) {
        withStats++;

        if (p.stats.rapid?.rating) {
          rapidSum += p.stats.rapid.rating;
          rapidCount++;
          totalGamesRapid += p.stats.rapid.games ?? 0;
        }

        if (p.stats.blitz?.rating) {
          blitzSum += p.stats.blitz.rating;
          blitzCount++;
          totalGamesBlitz += p.stats.blitz.games ?? 0;
        }

        if (p.stats.bullet?.rating) {
          bulletSum += p.stats.bullet.rating;
          bulletCount++;
          totalGamesBullet += p.stats.bullet.games ?? 0;
        }

        if (p.stats.daily?.rating) {
          dailySum += p.stats.daily.rating;
          dailyCount++;
          totalGamesDaily += p.stats.daily.games ?? 0;
        }

        if (p.stats.puzzles?.rating) {
          puzzlesSum += p.stats.puzzles.rating;
          puzzlesCount++;
        }
      }
    }

    const avgRapidRating = rapidCount ? rapidSum / rapidCount : null;
    const avgBlitzRating = blitzCount ? blitzSum / blitzCount : null;
    const avgBulletRating = bulletCount ? bulletSum / bulletCount : null;
    const avgDailyRating = dailyCount ? dailySum / dailyCount : null;
    const avgPuzzlesRating = puzzlesCount ? puzzlesSum / puzzlesCount : null;

    return {
      totalPlayers: players.length,
      withStats,
      avgRapidRating,
      avgBlitzRating,
      avgBulletRating,
      avgDailyRating,
      avgPuzzlesRating,
      totalGamesRapid,
      totalGamesBlitz,
      totalGamesBullet,
      totalGamesDaily,
    };
  }, [players]);

  // -------- TOP LISTS --------

  function buildTopByMode(mode: RatingMode, limit = 10): TopPlayerRow[] {
    const rows: TopPlayerRow[] = [];

    for (const p of players) {
      const s = p.stats;
      if (!s) continue;

      if (mode === "puzzles") {
        if (!s.puzzles?.rating) continue;
        rows.push({
          username: p.username,
          avatar: p.avatar,
          rating: s.puzzles.rating,
          games: s.puzzles.total ?? undefined,
        });
        continue;
      }

      const cat = s[mode];
      if (!cat?.rating) continue;

      rows.push({
        username: p.username,
        avatar: p.avatar,
        rating: cat.rating,
        games: cat.games,
      });
    }

    return rows
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  const topRapid = useMemo(() => buildTopByMode("rapid"), [players]);
  const topBlitz = useMemo(() => buildTopByMode("blitz"), [players]);
  const topBullet = useMemo(() => buildTopByMode("bullet"), [players]);
  const topDaily = useMemo(() => buildTopByMode("daily"), [players]);
  const topPuzzles = useMemo(() => buildTopByMode("puzzles"), [players]);

  const topFollowers = useMemo<TopPlayerRow[]>(() => {
    return players
      .map((p) => ({
        username: p.username,
        avatar: p.avatar,
        rating: p.followers ?? 0,
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);
  }, [players]);

  // -------- LOCATIONS --------

  const topLocations = useMemo<LocationRow[]>(() => {
    const counter: Record<string, number> = {};

    for (const p of players) {
      const loc = (p.location || "Sense localització").trim();
      counter[loc] = (counter[loc] || 0) + 1;
    }

    return Object.entries(counter)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [players]);

  // ============== RENDER ==============

  return (
    <div className="page">
      <div className="homepage">
        <header className="homepage-header">
          <div className="header-left">
            <div className="logo-circle">logo</div>
            <span className="brand">ChessStats</span>
          </div>

          <nav className="header-nav">
            <Link to="/" className="back-link">
              ← Tornar a l&apos;inici
            </Link>
          </nav>
        </header>

        <main className="homepage-main">
          {status === "loading" && <p>Carregant estadístiques globals…</p>}
          {status === "error" && (
            <p style={{ color: "red" }}>{error ?? "Error desconegut."}</p>
          )}

          {status === "ready" && (
            <section className="community">
              {/* ======= TÍTOL PRINCIPAL ======= */}
              <div className="community-header">
                <div>
                  <h2>Estadístiques de la comunitat</h2>
                  <p className="community-subtitle">
                    Resum global dels jugadors que han passat per ChessStats.
                  </p>
                </div>
                <span className="community-tag">
                  {aggregated.totalPlayers} jugadors registrats
                </span>
              </div>

              {/* ======= OVERVIEW CARDS ======= */}
              <div className="community-grid">
                <div className="community-card community-card-primary">
                  <div className="community-card-label">Jugadors totals</div>
                  <div className="community-card-value">
                    {aggregated.totalPlayers}
                  </div>
                  <div className="community-card-sub">
                    {aggregated.withStats} amb estadístiques carregades
                  </div>
                </div>

                <div className="community-card">
                  <div className="community-card-label">Elo mitjà Rapid</div>
                  <div className="community-card-value">
                    {aggregated.avgRapidRating
                      ? Math.round(aggregated.avgRapidRating)
                      : "–"}
                  </div>
                  <div className="community-card-sub">
                    {aggregated.totalGamesRapid} partides registrades
                  </div>
                </div>

                <div className="community-card">
                  <div className="community-card-label">Elo mitjà Blitz</div>
                  <div className="community-card-value">
                    {aggregated.avgBlitzRating
                      ? Math.round(aggregated.avgBlitzRating)
                      : "–"}
                  </div>
                  <div className="community-card-sub">
                    {aggregated.totalGamesBlitz} partides registrades
                  </div>
                </div>

                <div className="community-card">
                  <div className="community-card-label">Elo mitjà Bullet</div>
                  <div className="community-card-value">
                    {aggregated.avgBulletRating
                      ? Math.round(aggregated.avgBulletRating)
                      : "–"}
                  </div>
                  <div className="community-card-sub">
                    {aggregated.totalGamesBullet} partides registrades
                  </div>
                </div>

                <div className="community-card">
                  <div className="community-card-label">Elo mitjà Daily</div>
                  <div className="community-card-value">
                    {aggregated.avgDailyRating
                      ? Math.round(aggregated.avgDailyRating)
                      : "–"}
                  </div>
                  <div className="community-card-sub">
                    {aggregated.totalGamesDaily} partides registrades
                  </div>
                </div>

                <div className="community-card">
                  <div className="community-card-label">Puzzles – Elo mitjà</div>
                  <div className="community-card-value">
                    {aggregated.avgPuzzlesRating
                      ? Math.round(aggregated.avgPuzzlesRating)
                      : "–"}
                  </div>
                  <div className="community-card-sub">
                    Jugadors amb estadístiques de tàctiques
                  </div>
                </div>
              </div>

              {/* ======= TOP LISTS ======= */}
              <div className="community-sections">
                <section className="community-section">
                  <h3>Rànquing per modalitat</h3>
                  <p className="community-section-sub">
                    Top jugadors segons el seu ELO a Chess.com (dades que has
                    anat guardant a Firestore).
                  </p>

                  <div className="community-tables-grid">
                    <RankingTable title="Top Rapid" rows={topRapid} />
                    <RankingTable title="Top Blitz" rows={topBlitz} />
                    <RankingTable title="Top Bullet" rows={topBullet} />
                    <RankingTable title="Top Daily" rows={topDaily} />
                    <RankingTable title="Top Puzzles" rows={topPuzzles} />
                  </div>
                </section>

                <section className="community-section">
                  <h3>Jugadors més seguits</h3>
                  <p className="community-section-sub">
                    Ordenats pel nombre de followers al seu perfil de Chess.com.
                  </p>

                  <div className="community-tables-grid">
                    <RankingTable title="Top Followers" rows={topFollowers} unit="followers" />
                  </div>
                </section>

                <section className="community-section">
                  <h3>Localitzacions més freqüents</h3>
                  <p className="community-section-sub">
                    Resum dels llocs que declaren els jugadors al seu perfil de
                    Chess.com.
                  </p>

                  <div className="community-locations">
                    {topLocations.map((loc) => (
                      <div
                        key={loc.location}
                        className="community-location-row"
                      >
                        <span className="community-location-name">
                          {loc.location}
                        </span>
                        <span className="community-location-count">
                          {loc.count} jugador{loc.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

// =================== SUBCOMPONENT: TAULA RÀNQUING ===================

type RankingTableProps = {
  title: string;
  rows: TopPlayerRow[];
  unit?: string; // "followers" o "games" o res
};

function RankingTable({ title, rows, unit }: RankingTableProps) {
  return (
    <div className="ranking-card">
      <h4 className="ranking-title">{title}</h4>
      {rows.length === 0 && (
        <p className="ranking-empty">Encara no hi ha dades.</p>
      )}

      {rows.length > 0 && (
        <table className="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jugador</th>
              <th>Elo / Valor</th>
              {unit === "followers" && <th>Followers</th>}
              {unit !== "followers" && <th>Info</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.username}>
                <td>{idx + 1}</td>
                <td className="ranking-player-cell">
                  {r.avatar && (
                    <img
                      src={r.avatar}
                      alt={r.username}
                      className="ranking-avatar"
                    />
                  )}
                  <span>{r.username}</span>
                </td>
                <td>{r.rating}</td>
                {unit === "followers" ? (
                  <td>{r.rating}</td>
                ) : (
                  <td>{r.games != null ? `${r.games} games` : "—"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default CommunityStats;
