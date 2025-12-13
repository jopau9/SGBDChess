import { useState, useEffect } from "react";
import "./HomePage.css";
import CommunityStats from "../Statistics/CommunityStats";

import { db } from "../../libs/firebase.ts";
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

import WebActivityAnalytics from "../Analytics/WebActivityAnalytics.tsx";
import Header from "../../components/layout/Header";

type View =
  | "openings"
  | "topPlayers"
  | "topGames"
  | "advancedStats"
  | "webActivity";

export type PlayerStatsCategory = {
  rating: number;
  games: number;
  win: number;
  loss: number;
  draw: number;
};

export type PlayerStats = {
  rapid?: PlayerStatsCategory;
  blitz?: PlayerStatsCategory;
  bullet?: PlayerStatsCategory;
  daily?: PlayerStatsCategory;
  daily960?: PlayerStatsCategory;
  puzzles?: {
    rating: number;
    best: number;
    total: number;
  };
};

export type Player = {
  avatar: string;
  followers: number;
  id: number;
  is_streamer: boolean;
  joined: string;
  last_online: string;
  location: string;
  name: string;
  status: string;
  twitch_url: string;
  username: string;
  stats?: PlayerStats;
  // Les estadístiques es carreguen al Profile, aquí no cal
};

type SearchStatus = "idle" | "loading" | "found" | "not_found" | "error";

function HomePage() {
  const [activeView, setActiveView] = useState<View>("openings");
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q");

  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchingPlayers, setMatchingPlayers] = useState<Player[]>([]);

  const navigate = useNavigate();

  function formatUnixDate(ts?: number): string {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    return d.toISOString().slice(0, 10);
  }

  async function searchPlayerInChessDotCom(
    username: string
  ): Promise<Player | null> {
    try {
      const res = await fetch(
        `https://api.chess.com/pub/player/${username.toLowerCase()}`
      );

      if (!res.ok) {
        return null;
      }

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

      const apiPlayer = await searchPlayerInChessDotCom(term);

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
            className={activeView === "openings" ? "tab active" : "tab"}
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
            className={activeView === "topPlayers" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("topPlayers");
              navigate("/stats");
            }}
          >
            Top jugadors
          </button>
          <button
            className={activeView === "topGames" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("topGames");
              navigate("/stats");
            }}
          >
            Top partides
          </button>
          <button
            className={activeView === "advancedStats" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("advancedStats");
              navigate("/stats");
            }}
          >
            Estadístiques avançades
          </button>
          <button
            className={activeView === "webActivity" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("webActivity");
              navigate("/stats");
            }}
          >
            Web Activity
            <br />
            Analytics
          </button>

        </nav>

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
              {activeView === "webActivity" && (
                <WebActivityAnalytics />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function OpeningsView() {
  return (
    <section>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTopGames() {
      try {
        const gamesRef = collection(db, "games");

        // 1. Top Rated (by opponent_rating)
        const qRated = query(
          gamesRef,
          orderBy("opponent_rating", "desc"),
          limit(5)
        );
        const snapRated = await getDocs(qRated);
        setTopRatedGames(snapRated.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 2. Longest Games (by move_count)
        const qLong = query(gamesRef, orderBy("move_count", "desc"), limit(5));
        const snapLong = await getDocs(qLong);
        setLongestGames(snapLong.docs.map((d) => ({ id: d.id, ...d.data() })));

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
      <div className="top-games-column">
        <h3>🔥 Partides de més nivell</h3>
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
                className="game-card"
                style={{ animationDelay: `${i * 0.1}s` }}
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

      <div className="top-games-column">
        <h3>⏳ Partides més llargues</h3>
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
                className="game-card"
                style={{ animationDelay: `${i * 0.1}s` }}
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
    <section>
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
          👀
        </p>
      )}

      {status === "found" && players.length > 0 && (
        <ul className="players-list">
          {players.map((player) => (
            <li
              key={player.username}
              className="player-item"
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
