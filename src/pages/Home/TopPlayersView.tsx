// src/pages/Home/TopPlayersView.tsx
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../libs/firebase.ts";
import type { Player } from "../../libs/chess";
import { Link } from "react-router-dom";


type LoadStatus = "idle" | "loading" | "loaded" | "error";

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchTopPlayersFromChessCom(): Promise<Player[]> {
  const res = await fetch("https://api.chess.com/pub/leaderboards");

  if (!res.ok) {
    throw new Error("No s'ha pogut obtenir el leaderboard de Chess.com");
  }

  const data = await res.json();

  // 1. Get lists for Rapid, Blitz, Bullet
  const rapid = (data.live_rapid || []) as any[];
  const blitz = (data.live_blitz || []) as any[];
  const bullet = (data.live_bullet || []) as any[];

  // 2. Merge into a map to find max rating per player
  const playersMap = new Map<string, any>();

  const processList = (list: any[], mode: string) => {
    for (const p of list) {
      const username = p.username;
      const rating = p.score; // Leaderboard 'score' is the rating

      if (!playersMap.has(username)) {
        playersMap.set(username, {
          avatar: p.avatar ?? "",
          followers: 0,
          id: p.player_id ?? 0,
          is_streamer: false,
          joined: "",
          last_online: "",
          location: p.country?.replace("https://api.chess.com/pub/country/", "") ?? "",
          name: p.name ?? "",
          status: "",
          twitch_url: "",
          username: p.username ?? "",
          maxRating: rating,
          bestMode: mode
        });
      } else {
        const existing = playersMap.get(username);
        if (rating > existing.maxRating) {
          existing.maxRating = rating;
          existing.bestMode = mode;
        }
      }
    }
  };

  processList(rapid, "Rapid");
  processList(blitz, "Blitz");
  processList(bullet, "Bullet");

  // 3. Convert to array and sort by maxRating
  const allPlayers = Array.from(playersMap.values());
  allPlayers.sort((a, b) => b.maxRating - a.maxRating);

  // 4. Take top 50
  const top50 = allPlayers.slice(0, 50);

  // 5. Convert to Player type (adding maxRating as a custom property if needed, or just storing it)
  // We'll cast to Player but keep the extra props for display if we want
  return top50 as Player[];
}

async function loadTopPlayersForToday(): Promise<Player[]> {
  const todayKey = getTodayKey();

  const colRef = collection(db, "topPlayersDaily");
  const docRef = doc(colRef, todayKey);

  // 1) Intentem llegir de Firestore
  try {
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      // Check if it's the new format (merged)
      if (data.mode === "merged_max_rating") {
        const players = (data.players ?? []) as Player[];
        return players;
      }
      // If old format, ignore and fetch fresh
    }
  } catch (err) {
    console.warn("Error reading from Firestore (offline?), falling back to API:", err);
  }

  // 2) Si no existeix doc → demanem a Chess.com
  const players = await fetchTopPlayersFromChessCom();

  // 3) Desa-ho a Firestore per reutilitzar-ho durant el dia
  try {
    await setDoc(docRef, {
      date: todayKey,
      createdAt: serverTimestamp(),
      source: "https://api.chess.com/pub/leaderboards",
      mode: "merged_max_rating",
      players,
    });
  } catch (err) {
    console.warn("Error saving to Firestore (offline?):", err);
  }

  return players;
}

export function TopPlayersView() {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [players, setPlayers] = useState<any[]>([]); // Use any to access maxRating
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      try {
        setStatus("loading");
        setError(null);

        const result = await loadTopPlayersForToday();

        if (!isMounted) return;

        setPlayers(result);
        setStatus("loaded");
      } catch (err: any) {
        console.error(err);
        if (!isMounted) return;
        setError(err?.message ?? "S'ha produït un error inesperat.");
        setStatus("error");
      }
    }

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section>
      <h2>Top jugadors (Global)</h2>
      <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
        Els 50 millors jugadors del món segons la seva puntuació més alta (Rapid, Blitz o Bullet).
      </p>

      {status === "loading" && <p>Carregant top jugadors…</p>}

      {status === "error" && (
        <p style={{ color: "red" }}>{error ?? "Error desconegut."}</p>
      )}

      {status === "loaded" && players.length === 0 && (
        <p>No s'ha trobat cap jugador al leaderboard d&apos;avui.</p>
      )}

      {status === "loaded" && players.length > 0 && (
        <ol className="players-list">
          {players.map((player, index) => (
            <li
              key={player.username}
              className="player-item animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <Link
                to={`/profile/${player.username.toLowerCase()}`}
                className="player-link"
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%" }}
              >
                <div className="player-rank">#{index + 1}</div>

                {player.avatar && (
                  <img
                    src={player.avatar}
                    alt={player.username}
                    className="player-avatar-small"
                  />
                )}

                <div className="player-info" style={{ flex: 1 }}>
                  <strong>{player.username}</strong>
                  {player.name && <span>{player.name}</span>}
                  {player.location && <span>{player.location}</span>}
                </div>

                <div className="player-rating" style={{ textAlign: "right", minWidth: "80px" }}>
                  <strong style={{ fontSize: "1.1em", color: "#4caf50" }}>{player.maxRating}</strong>
                  <div style={{ fontSize: "0.8em", opacity: 0.7 }}>{player.bestMode}</div>
                </div>
              </Link>
            </li>

          ))}
        </ol>
      )}
    </section>
  );
}
