// src/pages/Profile/Profile.tsx
import "./Profile.css";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import { db } from "../../libs/firebase.ts";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";

import type {
  Player,
  PlayerStats,
  PlayerStatsCategory,
} from "../Home/HomePage";

type ProfileStatus = "loading" | "ready" | "not_found" | "error";

function formatUnixDate(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}


async function fetchPlayerFromChess(username: string): Promise<Player | null> {
  try {
    const res = await fetch(
      `https://api.chess.com/pub/player/${username.toLowerCase()}`
    );
    if (!res.ok) return null;

    const data = await res.json();

    const player: Player = {
      avatar: data.avatar ?? "",
      followers: data.followers ?? 0,
      id: data.player_id ?? 0,
      is_streamer: data.is_streamer ?? false,
      joined: formatUnixDate(data.joined),
      last_online: formatUnixDate(data.last_online),
      location: data.location ?? "",
      name: data.name ?? "",
      status: data.status ?? "",
      twitch_url: data.twitch_url ?? "",
      username: data.username ?? username,
    };

    return player;
  } catch (err) {
    console.error("Error consultant Chess.com:", err);
    return null;
  }
}

function mapCategory(cat: any): PlayerStatsCategory | undefined {
  if (!cat || !cat.last) return undefined;
  const record = cat.record ?? {};
  const win = record.win ?? 0;
  const loss = record.loss ?? 0;
  const draw = record.draw ?? 0;

  return {
    rating: cat.last.rating ?? 0,
    games: win + loss + draw,
    win,
    loss,
    draw,
  };
}

async function fetchPlayerStatsFromChess(
  username: string
): Promise<PlayerStats | undefined> {
  try {
    const res = await fetch(
      `https://api.chess.com/pub/player/${username.toLowerCase()}/stats`
    );
    if (!res.ok) return undefined;

    const data = await res.json();
    const stats: PlayerStats = {};

    if (data.chess_rapid) stats.rapid = mapCategory(data.chess_rapid);
    if (data.chess_blitz) stats.blitz = mapCategory(data.chess_blitz);
    if (data.chess_bullet) stats.bullet = mapCategory(data.chess_bullet);
    if (data.chess_daily) stats.daily = mapCategory(data.chess_daily);
    if (data.chess960_daily) stats.daily960 = mapCategory(data.chess960_daily);

    if (data.tactics && data.tactics.highest) {
      stats.puzzles = {
        rating: data.tactics.highest.rating ?? 0,
        best: data.tactics.highest.rating ?? 0,
        total: data.tactics.highest.games ?? 0,
      };
    }

    return stats;
  } catch (err) {
    console.error("Error consultant Chess.com (stats):", err);
    return undefined;
  }
}
async function fetchMonthlyGames(username: string, year: number, month: number) {
  const url = `https://api.chess.com/pub/player/${username}/games/${year}/${month}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.games ?? [];
}

async function fetchLastMonthsGames(username: string, months = 3) {
  const allGames: any[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;

    const monthly = await fetchMonthlyGames(username, year, month);
    allGames.push(...monthly);
  }

  return allGames;
}

function Profile() {
  const { username } = useParams<{ username: string }>();
  // --- OPENINGS ---
  const [openings, setOpenings] = useState<any[]>([]);

  // --- INSIGHTS ---
  const [insights, setInsights] = useState<any | null>(null);

  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // ⭐ PESTANYA ACTIVA DEL MENÚ LATERAL ⭐
  const [activeTab, setActiveTab] = useState<
    "rapid" | "openings" | "insights" | "advanced"
  >("rapid");


  useEffect(() => {
    if (!username) {
      setStatus("error");
      setError("No s'ha indicat cap usuari.");
      return;
    }

    async function loadProfile() {
      if (!username) return;
      try {
        setStatus("loading");
        setError(null);

        const usuarisRef = collection(db, "usuaris");

        // ----------------------------
        // 1) Busquem a Firestore
        // ----------------------------
        const q = query(usuarisRef, where("username", "==", username));
        const snap = await getDocs(q);

        let finalPlayer: Player | null = null;

        const normalizeDate = (value: any): string => {
          if (!value) return "";
          if (typeof value === "string") return value;
          if (typeof value === "number") return formatUnixDate(value);
          if (value.seconds) return formatUnixDate(value.seconds);
          return "";
        };

        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const raw = docSnap.data() as any;

          // Si no te stats, les carreguem
          let stats: PlayerStats | undefined = raw.stats;
          if (!stats) {
            stats = await fetchPlayerStatsFromChess(username);
            if (stats) await setDoc(docSnap.ref, { stats }, { merge: true });
          }

          finalPlayer = {
            avatar: raw.avatar ?? "",
            followers: raw.followers ?? 0,
            id: raw.id ?? 0,
            is_streamer: raw.is_streamer ?? false,
            joined: normalizeDate(raw.joined),
            last_online: normalizeDate(raw.last_online),
            location: raw.location ?? "",
            name: raw.name ?? "",
            status: raw.status ?? "",
            twitch_url: raw.twitch_url ?? "",
            username: raw.username ?? username,
            stats,
          };
        }

        // ----------------------------
        // 2) Si no el tenim, el busquem a Chess.com
        // ----------------------------
        if (!finalPlayer) {
          const apiPlayer = await fetchPlayerFromChess(username);
          if (!apiPlayer) {
            setPlayer(null);
            setStatus("not_found");
            return;
          }

          const stats = await fetchPlayerStatsFromChess(apiPlayer.username);
          finalPlayer = { ...apiPlayer, stats };

          // Guardem a Firestore
          const docRef = doc(usuarisRef, apiPlayer.username.toLowerCase());
          await setDoc(docRef, finalPlayer);
        }

        // Guardem el player
        setPlayer(finalPlayer);

        // ----------------------------
        // 3) CARREGAR PARTIDES REALS (per Openings + Insights)
        // ----------------------------
        const games = await fetchLastMonthsGames(username, 3); // últims 3 mesos

        // ----------------------------
        // 4) PROCESSAR OPENINGS
        // ----------------------------
        const openingStats: Record<string, any> = {};

        for (const g of games) {
          const opening = g.opening?.name ?? "Unknown Opening";
          if (!openingStats[opening]) {
            openingStats[opening] = { games: 0, wins: 0, losses: 0, draws: 0 };
          }

          openingStats[opening].games++;

          const isWhite =
            g.white.username?.toLowerCase() === username.toLowerCase();
          const result = isWhite ? g.white.result : g.black.result;

          if (result === "win") openingStats[opening].wins++;
          else if (
            result === "checkmated" ||
            result === "resigned" ||
            result === "timeout"
          )
            openingStats[opening].losses++;
          else openingStats[opening].draws++;
        }

        const openingList = Object.entries(openingStats)
          .map(([name, stats]: any) => ({
            name,
            ...stats,
            winrate: stats.games
              ? ((stats.wins / stats.games) * 100).toFixed(1)
              : "0",
          }))
          .sort((a, b) => b.games - a.games);

        setOpenings(openingList);

        // ----------------------------
        // 5) PROCESSAR INSIGHTS
        // ----------------------------
        const total = games.length;

        const asWhite = games.filter(
          (g) => g.white.username?.toLowerCase() === username.toLowerCase()
        );
        const asBlack = games.filter(
          (g) => g.black.username?.toLowerCase() === username.toLowerCase()
        );

        const wins = games.filter(
          (g) =>
            (g.white.username?.toLowerCase() === username.toLowerCase() &&
              g.white.result === "win") ||
            (g.black.username?.toLowerCase() === username.toLowerCase() &&
              g.black.result === "win")
        ).length;

        const winrate = total ? (wins / total) * 100 : 0;

        // Opening move més repetit
        const firstMoves: Record<string, number> = {};
        for (const g of games) {
          const pgn = g.pgn ?? "";
          const match = pgn.match(/\d+\.\s*(\S+)/);
          if (match) {
            const move = match[1];
            firstMoves[move] = (firstMoves[move] || 0) + 1;
          }
        }

        const topFirstMove =
          Object.entries(firstMoves).sort(
            (a: any, b: any) => b[1] - a[1]
          )[0]?.[0] ?? "Unknown";

        const avgElo =
          games.reduce(
            (sum, g) => sum + (g.white.rating + g.black.rating) / 2,
            0
          ) / (games.length || 1);

        setInsights({
          totalGames: total,
          winrate: winrate.toFixed(1),
          whiteGames: asWhite.length,
          blackGames: asBlack.length,
          avgOpponentElo: Math.round(avgElo),
          topFirstMove,
        });

        // Final
        setStatus("ready");
      } catch (err) {
        console.error(err);
        setError("No s'ha pogut carregar el perfil.");
        setStatus("error");
      }
    }

    loadProfile();
  }, [username]);


  const stats = player?.stats;
  const totalGames =
    (stats?.rapid?.games ?? 0) +
    (stats?.blitz?.games ?? 0) +
    (stats?.bullet?.games ?? 0) +
    (stats?.daily?.games ?? 0);

  return (
    <div className="page">
      <div className="homepage">
        <header className="homepage-header">
          <div className="header-left">
            <div className="logo-circle">logo</div>
            <span className="brand">ChessStats</span>
          </div>

          <Link to="/" className="back-link">
            ← Tornar a l&apos;inici
          </Link>
        </header>

        <main className="homepage-main">
          {status === "loading" && <p>Carregant perfil…</p>}
          {status === "error" && (
            <p style={{ color: "red" }}>{error ?? "Error desconegut."}</p>
          )}
          {status === "not_found" && (
            <p>
              No hem trobat el jugador <strong>{username}</strong>.
            </p>
          )}

          {status === "ready" && player && (
            <section className="profile">
              {/* ---------- HEADER ---------- */}
              <div className="profile-header">
                {player.avatar && (
                  <img
                    src={player.avatar}
                    alt={player.username}
                    className="profile-avatar"
                  />
                )}

                <div className="profile-main-info">
                  <div className="profile-username-row">
                    <h2 className="profile-username">{player.username}</h2>
                    {player.status && (
                      <span className="profile-status-pill">
                        {player.status}
                      </span>
                    )}
                  </div>

                  {player.name && (
                    <p className="profile-realname">{player.name}</p>
                  )}
                  {player.location && (
                    <p className="profile-location">{player.location}</p>
                  )}

                  <p className="profile-joined">
                    Membre des de: <strong>{player.joined || "–"}</strong>
                  </p>
                </div>

                <a
                  className="profile-external-link"
                  href={`https://www.chess.com/member/${player.username}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Obrir a Chess.com
                </a>
              </div>

              {/* ---------- LAYOUT ---------- */}
              <div className="profile-layout">
                {/* ------- SIDEBAR ------- */}
                <aside className="profile-sidebar">
                  <div className="profile-sidebar-block">
                    <h3>Stats</h3>
                    <ul className="profile-stats-menu">
                      <li
                        className={activeTab === "rapid" ? "active" : ""}
                        onClick={() => setActiveTab("rapid")}
                      >
                        Rapid
                      </li>

                      <li
                        className={activeTab === "openings" ? "active" : ""}
                        onClick={() => setActiveTab("openings")}
                      >
                        Openings
                      </li>

                      <li
                        className={activeTab === "insights" ? "active" : ""}
                        onClick={() => setActiveTab("insights")}
                      >
                        Insights
                      </li>


                    </ul>
                  </div>

                  <div className="profile-sidebar-block profile-meta">
                    <div className="profile-meta-row">
                      <span>Followers</span>
                      <strong>{player.followers ?? 0}</strong>
                    </div>

                    <div className="profile-meta-row">
                      <span>Last online</span>
                      <strong>{player.last_online || "–"}</strong>
                    </div>

                    {player.is_streamer && (
                      <div className="profile-meta-row">
                        <span>Streamer</span>
                        <strong>✔</strong>
                      </div>
                    )}

                    {player.twitch_url && (
                      <div className="profile-meta-row">
                        <span>Twitch</span>
                        <a
                          href={player.twitch_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {player.twitch_url}
                        </a>
                      </div>
                    )}
                  </div>
                </aside>

                {/* ---------- PANE PRINCIPAL ---------- */}
                <section className="profile-stats-pane">
                  <div className="stats-header">
                    <div>
                      {activeTab === "rapid" && <h3>All Stats</h3>}
                      {activeTab === "openings" && <h3>Openings</h3>}
                      {activeTab === "insights" && <h3>Insights</h3>}
                      {activeTab === "advanced" && <h3>Advanced Stats</h3>}

                      <p className="stats-subtitle">
                        {activeTab === "rapid" && "Resum d'elo i partides per modalitat"}
                        {activeTab === "openings" && "Principals obertures jugades"}
                        {activeTab === "insights" && "Dades avançades i rendiment"}
                        {activeTab === "advanced" && "Anàlisi profunda del joc: ritme, Elo, obertures i més"}
                      </p>

                    </div>

                  </div>



                  {/* ---------- CONTINGUT PER PESTANYA ---------- */}

                  {activeTab === "rapid" && (
                    <div className="stats-grid">
                      <div className="stat-card stat-card-primary">
                        <div className="stat-card-icon">♟️</div>
                        <div className="stat-card-value">
                          {stats ? totalGames : "–"}
                        </div>
                        <div className="stat-card-label">Games</div>
                        <div className="stat-card-sub">
                          Total de partides comptabilitzades
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-icon">☀️</div>
                        <div className="stat-card-value">
                          {stats?.daily?.rating ?? "–"}
                        </div>
                        <div className="stat-card-label">Daily</div>
                        <div className="stat-card-sub">
                          {stats?.daily?.games ?? 0} games
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-icon">⏱️</div>
                        <div className="stat-card-value">
                          {stats?.blitz?.rating ?? "–"}
                        </div>
                        <div className="stat-card-label">Blitz</div>
                        <div className="stat-card-sub">
                          {stats?.blitz?.games ?? 0} games
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-icon">⚡</div>
                        <div className="stat-card-value">
                          {stats?.bullet?.rating ?? "–"}
                        </div>
                        <div className="stat-card-label">Bullet</div>
                        <div className="stat-card-sub">
                          {stats?.bullet?.games ?? 0} games
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-icon">🎯</div>
                        <div className="stat-card-value">
                          {stats?.rapid?.rating ?? "–"}
                        </div>
                        <div className="stat-card-label">Rapid</div>
                        <div className="stat-card-sub">
                          {stats?.rapid?.games ?? 0} games
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-icon">🧩</div>
                        <div className="stat-card-value">
                          {stats?.puzzles?.rating ?? "–"}
                        </div>
                        <div className="stat-card-label">Puzzles</div>
                        <div className="stat-card-sub">
                          Millor: {stats?.puzzles?.best ?? "–"}
                        </div>
                      </div>

                      {stats?.daily960 && (
                        <div className="stat-card">
                          <div className="stat-card-icon">960</div>
                          <div className="stat-card-value">
                            {stats.daily960.rating}
                          </div>
                          <div className="stat-card-label">Daily 960</div>
                          <div className="stat-card-sub">
                            {stats.daily960.games} games
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "openings" && (
                    <div className="openings-list">
                      {openings.length === 0 && <p>No s'han trobat obertures recents.</p>}

                      {openings.slice(0, 10).map((o) => (
                        <div className="stat-card" key={o.name}>
                          <div className="stat-card-label">{o.name}</div>
                          <div className="stat-card-sub">
                            {o.games} games – {o.winrate}% WR
                            <br />
                            W:{o.wins} / L:{o.losses} / D:{o.draws}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}


                  {activeTab === "insights" && insights && (
                    <div className="stats-grid">

                      <div className="stat-card">
                        <div className="stat-card-label">Total Games</div>
                        <div className="stat-card-value">{insights.totalGames}</div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-label">Winrate</div>
                        <div className="stat-card-value">{insights.winrate}%</div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-label">Games as White</div>
                        <div className="stat-card-value">{insights.whiteGames}</div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-label">Games as Black</div>
                        <div className="stat-card-value">{insights.blackGames}</div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-label">Avg Opponent Elo</div>
                        <div className="stat-card-value">{insights.avgOpponentElo}</div>
                      </div>

                      <div className="stat-card">
                        <div className="stat-card-label">Most common first move</div>
                        <div className="stat-card-value">{insights.topFirstMove}</div>
                      </div>

                    </div>
                  )}
                </section>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default Profile;
