import { useState, useEffect } from "react";
import "./HomePage.css";
import CommunityStats from "../Statistics/CommunityStats";

import { db } from "../../libs/firebase.ts";
// import { useAuth } from "../../context/AuthContext"; // Removed unused import
import {
  collection,
  query,
  getDocs,
  orderBy,
  startAt,
  endAt,
  limit,
} from "firebase/firestore";

import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { TopPlayersView } from "./TopPlayersView";


import Header from "../../components/layout/Header";

type View =
  | "openings"
  | "topPlayers"
  | "topGames"
  | "advancedStats";

import {
  fetchPlayerFromChess,
  type Player,
} from "../../libs/chess";

type SearchStatus = "idle" | "loading" | "found" | "not_found" | "error";

function HomePage() {
  const [activeView, setActiveView] = useState<View>("openings");
  // const { currentUser } = useAuth(); // unused now
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q");

  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchingPlayers, setMatchingPlayers] = useState<Player[]>([]);

  const navigate = useNavigate();

  /* formatUnixDate and searchPlayerInChessDotCom replaced by imports */

  /* searchPlayerInChessDotCom moved to libs/chess.ts */

  async function searchPlayers(termRaw: string) {
    const term = termRaw.trim();

    if (!term) {
      setSearchStatus("idle");
      setMatchingPlayers([]);
      setSearchError(null);
      return;
    }

    setSearchStatus("loading");
    setSearchError(null);

    try {
      const usuarisRef = collection(db, "usuaris");

      const q = query(
        usuarisRef,
        orderBy("username"),
        startAt(term),
        endAt(term + "\uf8ff")
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const players: Player[] = snap.docs.map((doc) => doc.data() as Player);
        setMatchingPlayers(players);
        setSearchStatus("found");
        return;
      }


      const apiPlayer = await fetchPlayerFromChess(term);

      if (apiPlayer) {
        setMatchingPlayers([apiPlayer]);
        setSearchStatus("found");
      } else {
        setMatchingPlayers([]);
        setSearchStatus("not_found");
      }
    } catch (err) {
      console.error(err);
      setSearchError("Error consultant la base de dades");
      setSearchStatus("error");
      setMatchingPlayers([]);
    }
  }

  useEffect(() => {
    if (q) {
      searchPlayers(q);
    } else {
      setSearchStatus("idle");
      setMatchingPlayers([]);
    }
  }, [q]);

  const isSearchMode = !!q;

  return (
    <div className="page">
      <div className="homepage">
        <Header />

        <nav className="subnav">
          <button
            className={activeView === "openings" ? "tab active animate-fade-in" : "tab animate-fade-in"}
            style={{ animationDelay: "0s" }}
            onClick={() => {
              setActiveView("openings");
              navigate("/stats");
            }}
          >
            Millors
            <br />
            openings
          </button>
          <button
            className={activeView === "topPlayers" ? "tab active animate-fade-in" : "tab animate-fade-in"}
            style={{ animationDelay: "0.1s" }}
            onClick={() => {
              setActiveView("topPlayers");
              navigate("/stats");
            }}
          >
            Top jugadors
          </button>
          <button
            className={activeView === "topGames" ? "tab active animate-fade-in" : "tab animate-fade-in"}
            style={{ animationDelay: "0.2s" }}
            onClick={() => {
              setActiveView("topGames");
              navigate("/stats");
            }}
          >
            Top partides
          </button>
          <button
            className={activeView === "advancedStats" ? "tab active animate-fade-in" : "tab animate-fade-in"}
            style={{ animationDelay: "0.3s" }}
            onClick={() => {
              setActiveView("advancedStats");
              navigate("/stats");
            }}
          >
            Estadístiques avançades
          </button>
        </nav >

        <main className="homepage-main">
          {isSearchMode ? (
            <SearchResultsView
              searchTerm={q || ""}
              status={searchStatus}
              players={matchingPlayers}
              errorMessage={searchError ?? undefined}
              onSelectPlayer={(player) =>
                navigate(`/profile/${encodeURIComponent(player.username)}`)
              }
            />
          ) : (
            <>
              {activeView === "openings" && <OpeningsView />}
              {activeView === "topPlayers" && <TopPlayersView />}
              {activeView === "topGames" && <TopGamesView />}
              {activeView === "advancedStats" && (
                <CommunityStats />
              )}
            </>
          )
          }
        </main >
      </div >
    </div >
  );
}

function OpeningsView() {
  return (
    <section className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <h2>Millors openings</h2>
      <p>
        Aquí mostrarem estadístiques d&apos;openings (percentatge de victòries,
        rànquings, etc.).
      </p>
    </section>
  );
}

function TopGamesView() {
  const [topRatedGames, setTopRatedGames] = useState<any[]>([]);
  const [longestGames, setLongestGames] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTopGames() {
      try {
        const gamesRef = collection(db, "games");

        // 1. Top Rated (by opponent_rating)
        const qRated = query(
          gamesRef,
          orderBy("opponent_rating", "desc"),
          limit(200)
        );
        const snapRated = await getDocs(qRated);
        const allRated = snapRated.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Filter unique opponents
        const uniqueOpponents = new Set();
        const filteredRated: any[] = [];

        for (const game of allRated) {
          const opponent = (game as any).opponent_username;
          if (opponent && !uniqueOpponents.has(opponent)) {
            uniqueOpponents.add(opponent);
            filteredRated.push(game);
          }
          if (filteredRated.length >= 5) break;
        }

        setTopRatedGames(filteredRated);

        // 2. Longest Games (by move_count)
        const qLong = query(gamesRef, orderBy("move_count", "desc"), limit(5));
        const snapLong = await getDocs(qLong);
        setLongestGames(snapLong.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 3. Global Stats (Fetch all games)
        const snapAll = await getDocs(gamesRef);
        let totalGames = 0;
        let totalElo = 0;
        let totalMoves = 0;
        let wins = 0;
        let losses = 0;
        let draws = 0;



        let highestRatedWin = { rating: 0, opponent: "", id: "" };
        let quickestWin = { moves: 9999, opponent: "", id: "" };
        const openingsCount: Record<string, number> = {};

        snapAll.forEach((doc) => {
          const data = doc.data();
          totalGames++;
          const oppRating = Number(data.opponent_rating) || 0;
          const moves = Number(data.move_count) || 0;
          totalElo += oppRating;
          totalMoves += moves;

          const res = data.result;
          const isWin = res === "win";
          const isLoss = ["checkmated", "resigned", "timeout", "abandoned"].includes(res);

          if (isWin) {
            wins++;
            // Check highest rated win
            if (oppRating > highestRatedWin.rating) {
              highestRatedWin = { rating: oppRating, opponent: data.opponent_username || "Unknown", id: doc.id };
            }
            // Check quickest win (min 2 moves to be valid game)
            if (moves < quickestWin.moves && moves > 2) {
              quickestWin = { moves: moves, opponent: data.opponent_username || "Unknown", id: doc.id };
            }
          } else if (isLoss) {
            losses++;
          } else {
            draws++;
          }

          // Color stats (assuming user_color or inferring from pgn/data if available, 
          // but for now let's try to see if 'white' or 'black' is stored or we can infer.
          // If not available, we skip or mock. Let's assume 'user_color' exists or we skip.
          // Checking previous file content, I didn't see user_color. 
          // Let's rely on 'white.username' == user.username if available, but we don't have user context here easily without auth.
          // simpler: let's just count openings for now.)

          if (data.opening) {
            const opName = data.opening.split(":")[0]; // Simplify opening name
            openingsCount[opName] = (openingsCount[opName] || 0) + 1;
          }
        });

        // Find favorite opening
        let favOpening = "-";
        let maxOpCount = 0;
        Object.entries(openingsCount).forEach(([op, count]) => {
          if (count > maxOpCount) {
            maxOpCount = count;
            favOpening = op;
          }
        });

        setGlobalStats({
          totalGames,
          avgElo: totalGames > 0 ? Math.round(totalElo / totalGames) : 0,
          avgMoves: totalGames > 0 ? Math.round(totalMoves / totalGames) : 0,
          wins,
          losses,
          draws,
          winRate: totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0",
          highestRatedWin: highestRatedWin.rating > 0 ? highestRatedWin : null,
          quickestWin: quickestWin.moves < 9999 ? quickestWin : null,
          favOpening
        });

        setLoading(false);
      } catch (err) {
        console.error("Error loading top games:", err);
        setLoading(false);
      }
    }

    loadTopGames();
  }, []);

  if (loading) return <p>Carregant partides destacades...</p>;

  return (
    <section className="top-games-section">
      <div className="top-games-grid">
        {/* Columna 1: Top Rated */}
        <div
          className="top-games-column animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h3>Partides de més nivell</h3>
          <p className="section-desc">
            Partides contra els rivals amb més ELO registrades a la base de dades.
          </p>
          <div className="games-list">
            {topRatedGames.map((g, i) => (
              <Link
                key={i}
                to={`/game/${g.id}`}
                className="game-card-link"
                state={{ fromTopGames: true }}
              >
                <div
                  className="game-card animate-fade-in"
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                >
                  <div className="game-card-header">
                    <span className="game-card-players">
                      {g.username} vs {g.opponent_username || g.opponent_rating}
                    </span>
                    <span className="game-result result-top-game">
                      {formatTopGameResult(g)}
                    </span>
                  </div>
                  <div className="game-card-meta">
                    <span>{g.opening}</span>
                    <span>{g.time_class}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Columna 2: Longest Games */}
        <div
          className="top-games-column animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <h3>Partides més llargues</h3>
          <p className="section-desc">
            Les batalles més dures i resistents per nombre de moviments.
          </p>
          <div className="games-list">
            {longestGames.map((g, i) => (
              <Link
                key={i}
                to={`/game/${g.id}`}
                className="game-card-link"
                state={{ fromTopGames: true }}
              >
                <div
                  className="game-card animate-fade-in"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <div className="game-card-header">
                    <span className="game-card-players">
                      {g.username} vs {g.opponent_username || "Unknown"}
                    </span>
                    <span className="game-moves">{g.move_count} moviments</span>
                  </div>
                  <div className="game-card-meta">
                    <span>{g.opening}</span>
                    <span className="game-result result-top-game">
                      {formatTopGameResult(g)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Columna 3: Global Stats (Full Width) */}
      <div
        className="global-stats-section animate-fade-in"
        style={{ animationDelay: "0.3s" }}
      >
        <h3>Estadístiques Globals</h3>
        <p className="section-desc">
          Dades acumulades i curiositats de totes les partides registrades.
        </p>

        {globalStats && (
          <div className="global-stats-grid">
            {/* Main Counters */}
            <div className="stat-card main-stat">
              <span className="stat-icon">📊</span>
              <div className="stat-info">
                <span className="stat-value">{globalStats.totalGames}</span>
                <span className="stat-label">Total Partides</span>
              </div>
            </div>

            <div className="stat-card main-stat">
              <span className="stat-icon">🏆</span>
              <div className="stat-info">
                <span className="stat-value">{globalStats.winRate}%</span>
                <span className="stat-label">Percentatge de Victòries</span>
              </div>
            </div>

            <div className="stat-card main-stat">
              <span className="stat-icon">🧠</span>
              <div className="stat-info">
                <span className="stat-value">{globalStats.avgElo}</span>
                <span className="stat-label">ELO Mig Rival</span>
              </div>
            </div>

            <div className="stat-card main-stat">
              <span className="stat-icon">📏</span>
              <div className="stat-info">
                <span className="stat-value">{globalStats.avgMoves}</span>
                <span className="stat-label">Moviments / Partida</span>
              </div>
            </div>

            {/* Detailed Stats */}
            {globalStats.highestRatedWin && (
              <div className="stat-card highlight-stat">
                <span className="stat-icon">🏔️</span>
                <div className="stat-info">
                  <span className="stat-value">{globalStats.highestRatedWin.rating}</span>
                  <span className="stat-label">Millor Victòria (vs {globalStats.highestRatedWin.opponent})</span>
                </div>
              </div>
            )}

            {globalStats.quickestWin && (
              <div className="stat-card highlight-stat">
                <span className="stat-icon">⚡</span>
                <div className="stat-info">
                  <span className="stat-value">{globalStats.quickestWin.moves} movs</span>
                  <span className="stat-label">Victòria més ràpida (vs {globalStats.quickestWin.opponent})</span>
                </div>
              </div>
            )}

            <div className="stat-card highlight-stat">
              <span className="stat-icon">♟️</span>
              <div className="stat-info">
                <span className="stat-value" title={globalStats.favOpening}>{globalStats.favOpening}</span>
                <span className="stat-label">Opening preferit</span>
              </div>
            </div>

            {/* W/L/D Breakdown */}
            <div className="stat-card breakdown-stat">
              <div className="wld-bar">
                <div className="wld-segment win" style={{ flex: globalStats.wins }} title={`${globalStats.wins} Victòries`}></div>
                <div className="wld-segment draw" style={{ flex: globalStats.draws }} title={`${globalStats.draws} Empats`}></div>
                <div className="wld-segment loss" style={{ flex: globalStats.losses }} title={`${globalStats.losses} Derrotes`}></div>
              </div>
              <div className="wld-labels">
                <span className="win-text">{globalStats.wins} W</span>
                <span className="draw-text">{globalStats.draws} D</span>
                <span className="loss-text">{globalStats.losses} L</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}

function formatTopGameResult(game: any): string {
  const isWin = game.result === "win";
  const isLoss = ["checkmated", "resigned", "timeout", "abandoned"].includes(game.result);

  if (isWin) return `Victòria ${game.username}`;
  if (isLoss) return `Victòria ${game.opponent_username || "Oponent"}`;
  return "Empat";
}

type SearchResultsProps = {
  searchTerm: string;
  status: SearchStatus;
  players: Player[];
  errorMessage?: string;
  onSelectPlayer: (player: Player) => void;
};

function SearchResultsView({
  searchTerm,
  status,
  players,
  errorMessage,
  onSelectPlayer,
}: SearchResultsProps) {
  return (
    <section className="animate-fade-in">
      <h2>Resultats de la cerca</h2>

      {searchTerm && (
        <p>
          Has cercat: <strong>{searchTerm}</strong>
        </p>
      )}

      {status === "idle" && <p>Escriu un nom a la barra de cerca.</p>}

      {status === "loading" && <p>Buscant jugadors…</p>}

      {status === "error" && (
        <p style={{ color: "red" }}>
          {errorMessage ?? "S'ha produït un error inesperat."}
        </p>
      )}

      {status === "not_found" && (
        <p>
          No hem trobat cap jugador ni a la nostra base de dades ni a Chess.com.
        </p>
      )}

      {status === "found" && players.length > 0 && (
        <ul className="players-list">
          {players.map((player, i) => (
            <li
              key={player.username}
              className="player-item animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => onSelectPlayer(player)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectPlayer(player);
                }
              }}
            >
              {player.avatar && (
                <img
                  src={player.avatar}
                  alt={player.username}
                  className="player-avatar-small"
                />
              )}
              <div className="player-info">
                <strong>{player.username}</strong>
                <span>{player.name}</span>
                <span>{player.location}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default HomePage;
