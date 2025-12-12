// src/pages/Home/HomePage.tsx
import { useState, type FormEvent } from "react";
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
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";
import { TopPlayersView } from "./TopPlayersView";

import logo from "../../assets/logo.png";
import WebActivityAnalytics from "../Analytics/WebActivityAnalytics.tsx";

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
};

type SearchStatus = "idle" | "loading" | "found" | "not_found" | "error";

function HomePage() {
  const [activeView, setActiveView] = useState<View>("openings");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastSearch, setLastSearch] = useState<string | null>(null);

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
        // Les estadístiques es carreguen al Profile, aquí no cal
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
      setLastSearch(null);
      return;
    }

    setSearchStatus("loading");
    setSearchError(null);
    setLastSearch(term);

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

  async function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    await searchPlayers(searchTerm);
  }

  const isSearchMode = searchTerm.trim().length > 0;




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

          <form className="search-bar" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              placeholder="Busca un jugador"
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);

                if (!value.trim()) {
                  setActiveView("openings");
                  setMatchingPlayers([]);
                  setSearchStatus("idle");
                  setSearchError(null);
                  setLastSearch(null);
                  return;
                }

                searchPlayers(value);
              }}
            />
            <button type="submit">cerca</button>
          </form>
        </header>

        <nav className="subnav">
          <button
            className={activeView === "openings" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("openings");
              setSearchTerm("");
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
              setSearchTerm("");
            }}
          >
            Top jugadors
          </button>
          <button
            className={activeView === "topGames" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("topGames");
              setSearchTerm("");
            }}
          >
            Top partides
          </button>
          <button
            className={activeView === "advancedStats" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("advancedStats");
              setSearchTerm("");
            }}
          >
            Estadístiques avançades
          </button>
          <button
            className={activeView === "webActivity" ? "tab active" : "tab"}
            onClick={() => {
              setActiveView("webActivity");
              setSearchTerm("");
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
              searchTerm={lastSearch ?? searchTerm}
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
  return (
    <section>
      <h2>Top partides</h2>
      <p>
        Aquí mostrarem partides espectaculars, llargues o amb sacrificis
        interessants.
      </p>
    </section>
  );
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
