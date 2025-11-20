// src/pages/Home/TopPlayersView.tsx
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../libs/firebase";
import type { Player } from "./HomePage"; // reutilitzem el tipus

type LoadStatus = "idle" | "loading" | "loaded" | "error";

function getTodayKey(): string {
  // 🔹 Si vols ser estrictament local (Europe/Madrid), podries fer servir
  // una llibreria com dayjs o luxon. Per ara fem servir la data local
  // amb format YYYY-MM-DD sense dependències externes:
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

  // 🔹 Escollim, per exemple, el leaderboard de live_rapid
  const rapid = data.live_rapid as any[];

  if (!Array.isArray(rapid) || rapid.length === 0) {
    throw new Error("Chess.com no ha retornat dades de live_rapid");
  }

  // Ens quedem amb els 50 primers (o el que vulguis)
  const top = rapid.slice(0, 50);

  const players: Player[] = top.map((p) => ({
    avatar: p.avatar ?? "",
    followers: 0, // l'endpoint de leaderboards no ho dóna
    id: p.player_id ?? 0,
    is_streamer: false, // tampoc ve aquí
    joined: "", // per no fer una crida extra per jugador
    last_online: "",
    location: p.country ?? "",
    name: p.name ?? "",
    status: "", // no hi ha status al leaderboard
    twitch_url: "",
    username: p.username ?? "",
  }));

  return players;
}

async function loadTopPlayersForToday(): Promise<Player[]> {
  const todayKey = getTodayKey();

  const colRef = collection(db, "topPlayersDaily");
  const docRef = doc(colRef, todayKey);

  // 1) Intentem llegir de Firestore
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    const players = (data.players ?? []) as Player[];
    return players;
  }

  // 2) Si no existeix doc → demanem a Chess.com
  const players = await fetchTopPlayersFromChessCom();

  // 3) Desa-ho a Firestore per reutilitzar-ho durant el dia
  await setDoc(docRef, {
    date: todayKey,
    createdAt: serverTimestamp(),
    source: "https://api.chess.com/pub/leaderboards",
    mode: "live_rapid",
    players,
  });

  return players;
}

export function TopPlayersView() {
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [players, setPlayers] = useState<Player[]>([]);
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
      <h2>Top jugadors (live rapid)</h2>
      <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
        Es mostra el top del dia. La primera vegada que algú obre aquesta
        secció, es guarda a la base de dades per reutilitzar-lo.
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
            <li key={player.username} className="player-item">
              <div className="player-rank">#{index + 1}</div>
              {player.avatar && (
                <img
                  src={player.avatar}
                  alt={player.username}
                  className="player-avatar-small"
                />
              )}
              <div className="player-info">
                <strong>{player.username}</strong>
                {player.name && <span>{player.name}</span>}
                {player.location && <span>{player.location}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
