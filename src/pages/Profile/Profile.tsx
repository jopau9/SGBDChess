// src/pages/Profile/Profile.tsx
import "./Profile.css";
import logo from "../../assets/logo.png";

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
import ProfileGamesList from "./ProfileGamesList";

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




const ECO_BOOK: Record<string, string> = {
  // A - Flank openings
  "A00": "Uncommon Opening",
  "A04": "Reti Opening",
  "A06": "Zukertort Opening",
  "A10": "English Opening",
  "A12": "English Opening: Caro-Kann Defensive System",
  "A20": "English Opening",
  "A25": "English Opening: Sicilian Reversed",
  "A40": "Queen's Pawn Game",
  "A45": "Trompowsky Attack",
  "A46": "Queen's Pawn: Torre Attack",
  "A48": "London System",

  // B - Semi-open (1.e4 defenses)
  "B00": "King's Pawn Game",
  "B01": "Scandinavian Defense",
  "B06": "Robatsch (Modern) Defense",
  "B07": "Pirc Defense",
  "B10": "Caro-Kann Defense",
  "B20": "Sicilian Defense",
  "B22": "Alapin Sicilian",
  "B23": "Closed Sicilian",
  "B30": "Sicilian Defense: Rossolimo",
  "B40": "Sicilian Defense: Scheveningen",

  // C - Open games (1.e4 e5)
  "C20": "King's Pawn Game",
  "C23": "Bishop's Opening",
  "C30": "King's Gambit",
  "C40": "King's Knight Opening",
  "C50": "Italian Game",
  "C60": "Ruy Lopez",
  "C65": "Ruy Lopez: Berlin Defense",
  "C70": "Ruy Lopez: Classical",

  // D - Closed (d4 d5 c4)
  "D00": "Queen's Pawn Game",
  "D02": "London System",
  "D04": "Colle System",
  "D10": "Slav Defense",
  "D20": "Queen's Gambit Accepted",
  "D30": "Queen's Gambit",
  "D31": "Queen's Gambit Declined",

  // E - Indian Defenses (1.d4 Nf6)
  "E00": "Indian Defense",
  "E20": "Nimzo-Indian Defense",
  "E60": "King's Indian Defense",
  "E80": "King's Indian Defense: Saemisch",

  // DEFAULT
};



function extractOpeningFromPGN(pgn: string): { opening: string; eco: string | null } {
  if (!pgn) return { opening: "Unknown Opening", eco: null };

  // 1) Intentem agafar ECO real del PGN
  const ecoMatch = pgn.match(/\[ECO\s+"([^"]+)"\]/i);
  const eco = ecoMatch ? ecoMatch[1] : null;

  // 2) Intentem agafar Opening real del PGN
  const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/i);
  if (openingMatch) {
    return { opening: openingMatch[1], eco };
  }

  // 3) Si tenim ECO al llibre → retornem
  if (eco && ECO_BOOK[eco]) {
    return { opening: ECO_BOOK[eco], eco };
  }

  // 4) Detectem la línia de moviments
  const movesLine = pgn.split("\n").find((l) => /^\s*1\./.test(l));
  if (!movesLine) return { opening: "Unknown Opening", eco };

  // Neteja comentaris i números
  const moves = movesLine
    .replace(/\{[^}]+\}/g, "")
    .replace(/\d+\.(\.\.)?/g, "")
    .trim()
    .split(/\s+/)
    .map((m) => m.toLowerCase());

  const m1 = moves[0] || "";
  const m2 = moves[1] || "";

  // 5) Patrons bàsics (captura >70% de partides)
  if (m1 === "e4") {
    if (m2 === "c5") return { opening: "Sicilian Defense", eco };
    if (m2 === "e5") return { opening: "Open Game (1.e4 e5)", eco };
    if (m2 === "e6") return { opening: "French Defense", eco };
    if (m2 === "c6") return { opening: "Caro-Kann Defense", eco };
    if (m2 === "d5") return { opening: "Scandinavian Defense", eco };
  }

  if (m1 === "d4") {
    if (m2 === "d5") return { opening: "Queen's Gambit / QGD", eco };
    if (m2 === "nf6") return { opening: "Indian Defense", eco };
    if (m2 === "g6") return { opening: "King's Indian / Grünfeld", eco };
  }

  if (m1 === "c4") return { opening: "English Opening", eco };
  if (m1 === "nf3") return { opening: "Reti Opening", eco };
  if (m1 === "g3") return { opening: "King's Fianchetto Opening", eco };

  // 6) Fallback FINAL → sempre coherent
  return { opening: "Unknown Opening", eco };
}




async function fetchArchives(username: string) {
  const url = `https://api.chess.com/pub/player/${username}/games/archives`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.archives || [];
}

async function fetchGamesFromArchive(archiveUrl: string) {
  const res = await fetch(archiveUrl);
  if (!res.ok) return [];
  const data = await res.json();
  return data.games || [];
}

async function fetchRecentGames(
  username: string,
  limitGames = 25,
  onGameLoaded?: () => void
) {
  const archives = await fetchArchives(username);
  if (archives.length === 0) return [];

  // Ordenem inversament per començar pel mes més recent
  const reversedArchives = archives.reverse();
  const all: any[] = [];

  for (const url of reversedArchives) {
    if (all.length >= limitGames) break;

    const games = await fetchGamesFromArchive(url);
    // Els jocs de l'arxiu estan en ordre cronològic (del 1 al 30 del mes)
    // Volem els últims, així que invertim l'array de jocs d'aquest mes
    const reversedGames = games.reverse();

    for (const g of reversedGames) {
      if (all.length >= limitGames) break;

      all.push(g);
      if (onGameLoaded) onGameLoaded();
    }
  }

  return all;
}




function safeGameId(g: any, username: string) {
  if (g.url) {
    const parts = g.url.split("/");
    return parts[parts.length - 1]; // últim segment
  }
  return `${username}-${g.end_time}`;
}

function countMoves(pgn: string): number {
  if (!pgn) return 0;
  // Match move numbers "1.", "2.", etc.
  const matches = pgn.match(/\d+\./g);
  return matches ? matches.length : 0;
}

async function saveGamesToFirebase(username: string, games: any[]) {
  const gamesRef = collection(db, "games");

  for (const g of games) {
    const id = safeGameId(g, username);


    const docRef = doc(gamesRef, id);

    // OPTIMITZACIÓ: No fem getDoc per estalviar lectures.
    // Fem directament setDoc amb merge: true.
    // Si la partida ja existeix, s'actualitzarà. Si no, es crearà.
    // L'únic inconvenient és que escrivim sempre, però estalviem la lectura.
    // Com que només processem 25 partides, són 25 escriptures màxim per visita.

    const isWhite =
      g.white?.username?.toLowerCase() === username.toLowerCase();
    const side = isWhite ? g.white : g.black;
    const opp = isWhite ? g.black : g.white;

    const { opening, eco } = extractOpeningFromPGN(g.pgn || "");

    if (opening === "Unknown Opening") continue;

    let opponentName = opp?.username;

    // Si no tenim nom (o és el mateix usuari per error de càlcul), intentem treure-ho del PGN de forma robusta
    if (!opponentName || opponentName.toLowerCase() === username.toLowerCase()) {
      opponentName = resolveOpponentName(g.pgn || "", username);
    }

    const gameData = {
      username,
      timestamp: g.end_time || null,
      opening,
      eco,
      color: isWhite ? "white" : "black",
      result: side?.result || "unknown",
      opponent_rating: opp?.rating || null,
      first_move: extractFirstMove(g.pgn || ""),
      time_class: g.time_class || "unknown",
      pgn: g.pgn || "",
      move_count: countMoves(g.pgn || ""),
      url: g.url || "",
      opponent_username: opponentName || "Unknown",
    };

    await setDoc(docRef, gameData, { merge: true });
  }
}

function extractFirstMove(pgn: string): string {
  if (!pgn) return "—";

  // Captura el primer moviment després de "1."
  const match = pgn.match(/^1\.\s*([a-h][1-8]|[NBRQK][a-h][1-8])/m);

  return match ? match[1] : "—";
}

function resolveOpponentName(pgn: string, currentUsername: string): string | null {
  if (!pgn) return null;

  const whiteMatch = pgn.match(/\[White\s+"([^"]+)"\]/i);
  const blackMatch = pgn.match(/\[Black\s+"([^"]+)"\]/i);

  const whiteName = whiteMatch ? whiteMatch[1] : null;
  const blackName = blackMatch ? blackMatch[1] : null;

  if (whiteName?.toLowerCase() === currentUsername.toLowerCase()) return blackName;
  if (blackName?.toLowerCase() === currentUsername.toLowerCase()) return whiteName;

  // Si no coincideix cap, potser és que el username de l'API és diferent al del PGN?
  // Retornem el que no sigui el currentUsername (si n'hi ha un que ho sigui)
  // Si cap ho és... retornem el contrari del que s'ha detectat com a isWhite?
  // Per seguretat, si arribem aquí, retornem null o un dels dos si l'altre és null.

  if (whiteName && !blackName) return whiteName; // Raro
  if (blackName && !whiteName) return blackName; // Raro

  return null;
}




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
