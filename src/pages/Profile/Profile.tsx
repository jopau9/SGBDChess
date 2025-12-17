// src/pages/Profile/Profile.tsx
import "./Profile.css";
import logo from "../../assets/logo.png";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FollowButton from "../../components/social/FollowButton";
import FollowingList from "../../components/social/FollowingList";

import { db } from "../../libs/firebase.ts";
import { useAuth } from "../../context/AuthContext";
import { getUserAccount } from "../../libs/auth";
import RivalryCard from "../../components/social/RivalryCard";
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
} from "../../libs/chess";
import {
  fetchPlayerFromChess,
  fetchPlayerStatsFromChess,
  fetchRecentGames,
  saveGamesToFirebase,
  extractOpeningFromPGN,
  formatUnixDate,
} from "../../libs/chess";
import ProfileGamesList from "./ProfileGamesList";

type ProfileStatus = "loading" | "ready" | "not_found" | "error";


// Functions moved to src/libs/chess.ts




function Profile() {
  const [liveGameCount, setLiveGameCount] = useState(0);
  const [loadingGames, setLoadingGames] = useState(true);

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
    "rapid" | "openings" | "insights" | "advanced" | "games"
  >("rapid");

  // RIVALRY
  const { currentUser } = useAuth();
  const [myChessUsername, setMyChessUsername] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      getUserAccount(currentUser.uid).then((account) => {
        if (account?.chessUsername) {
          setMyChessUsername(account.chessUsername);
        }
      });
    }
  }, [currentUser]);


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
        setStatus("ready");
        // ----------------------------
        // 3) CARREGAR PARTIDES REALS (per Openings + Insights)
        // ----------------------------
        // Activem el comptador ABANS de començar
        setLoadingGames(true);
        setLiveGameCount(0);

        const games = await fetchRecentGames(username, 25, () => {
          setLiveGameCount((c) => c + 1);
        });

        // Guardem les partides (optimitzat per lectures)
        await saveGamesToFirebase(username, games);

        // ----------------------------
        // 4) PROCESSAR OPENINGS
        // ----------------------------
        const openingStats: Record<string, any> = {};

        for (const g of games) {
          const opening =
            g.opening?.name ||
            extractOpeningFromPGN(g.pgn || "") ||
            "Opening not detected";
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
        setLoadingGames(false);

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
            <div className="logo-circle">
              <img src={logo} alt="logo" className="logo-img" />
            </div>
            <span className="brand">ChessStats</span>
          </div>

          <Link to="/stats" className="back-link">
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
                      <span className="profile-status-pill">{player.status}</span>
                    )}
                    <FollowButton
                      targetUsername={player.username}
                      targetAvatar={player.avatar}
                      className="ml-3"
                    />
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

                      <li
                        className={activeTab === "games" ? "active" : ""}
                        onClick={() => setActiveTab("games")}
                      >
                        Partides
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
                        <a href={player.twitch_url} target="_blank" rel="noreferrer">
                          {player.twitch_url}
                        </a>
                      </div>
                    )}
                  </div>

                  <FollowingList />
                </aside>

                {/* ---------- PANEL PRINCIPAL ---------- */}
                <section className="profile-stats-pane">
                  <div className="stats-header">
                    <div>
                      {activeTab === "rapid" && <h3>All Stats</h3>}
                      {activeTab === "openings" && <h3>Openings</h3>}
                      {activeTab === "insights" && <h3>Insights</h3>}
                      {activeTab === "games" && <h3>Partides Recents</h3>}

                      <p className="stats-subtitle">
                        {activeTab === "rapid" && "Resum d'elo i partides per modalitat"}
                        {activeTab === "openings" && "Principals obertures jugades"}
                        {activeTab === "insights" && "Dades avançades i rendiment"}
                        {activeTab === "games" && "Historial de partides recents"}
                      </p>
                    </div>
                  </div>

                  {/* ======== CONTINGUT PER PESTANYA ======== */}

                  {myChessUsername && player.username && myChessUsername.toLowerCase() !== player.username.toLowerCase() && (
                    <RivalryCard
                      myChessUsername={myChessUsername}
                      opponentChessUsername={player.username}
                      opponentAvatar={player.avatar}
                    />
                  )}

                  {/* ---------- RAPID (normal) ---------- */}
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

                  {/* ---------- GAMES LIST ---------- */}
                  {activeTab === "games" && (
                    <ProfileGamesList username={username || ""} />
                  )}

                  {/* ---------- OPENINGS ---------- */}
                  {activeTab === "openings" && (
                    <>
                      {loadingGames ? (
                        <div className="loading-box">
                          <p>
                            Carregant partides…{" "}
                            <strong>{liveGameCount}</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="openings-list">
                          {openings.length === 0 && (
                            <p>No s'han trobat obertures recents.</p>
                          )}

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
                    </>
                  )}

                  {/* ---------- INSIGHTS ---------- */}
                  {activeTab === "insights" && (
                    <>
                      {loadingGames ? (
                        <div className="loading-box">
                          <p>
                            Carregant partides…{" "}
                            <strong>{liveGameCount}</strong>
                          </p>
                        </div>
                      ) : (
                        insights && (
                          <div className="stats-grid">
                            <div className="stat-card">
                              <div className="stat-card-label">Total Games</div>
                              <div className="stat-card-value">
                                {insights.totalGames}
                              </div>
                            </div>

                            <div className="stat-card">
                              <div className="stat-card-label">Winrate</div>
                              <div className="stat-card-value">
                                {insights.winrate}%
                              </div>
                            </div>

                            <div className="stat-card">
                              <div className="stat-card-label">Games as White</div>
                              <div className="stat-card-value">
                                {insights.whiteGames}
                              </div>
                            </div>

                            <div className="stat-card">
                              <div className="stat-card-label">Games as Black</div>
                              <div className="stat-card-value">
                                {insights.blackGames}
                              </div>
                            </div>

                            <div className="stat-card">
                              <div className="stat-card-label">Avg Opponent Elo</div>
                              <div className="stat-card-value">
                                {insights.avgOpponentElo}
                              </div>
                            </div>

                            <div className="stat-card">
                              <div className="stat-card-label">
                                Most common first move
                              </div>
                              <div className="stat-card-value">
                                {insights.topFirstMove}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </>
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
