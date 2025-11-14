// src/pages/Profile/Profile.tsx
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

import type { Player } from "../Home/HomePage";

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

function Profile() {
  const { username } = useParams<{ username: string }>();

  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setStatus("error");
      setError("No s'ha indicat cap usuari.");
      return;
    }

    async function loadProfile() {
      try {
        setStatus("loading");
        setError(null);

        const usuarisRef = collection(db, "usuaris");

        // 1) Intentem trobar-lo a Firestore
        const q = query(usuarisRef, where("username", "==", username));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const data = snap.docs[0].data() as Player;
          setPlayer(data);
          setStatus("ready");
          return;
        }

        // 2) Si no és a Firestore, mirem Chess.com
        const apiPlayer = await fetchPlayerFromChess(username!);

        if (!apiPlayer) {
          setPlayer(null);
          setStatus("not_found");
          return;
        }

        // 3) Guardem-lo a la nostra BD amb doc id = username en minúscules
        const docRef = doc(usuarisRef, apiPlayer.username.toLowerCase());
        await setDoc(docRef, apiPlayer);

        setPlayer(apiPlayer);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        setError("No s'ha pogut carregar el perfil.");
        setStatus("error");
      }
    }

    loadProfile();
  }, [username]);

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
              No hem trobat el jugador <strong>{username}</strong> ni a la base
              de dades ni a Chess.com.
            </p>
          )}

          {status === "ready" && player && (
            <section className="profile">
              <div className="profile-header">
                {player.avatar && (
                  <img
                    src={player.avatar}
                    alt={player.username}
                    className="profile-avatar"
                  />
                )}
                <div>
                  <h2>{player.username}</h2>
                  {player.name && <p>{player.name}</p>}
                  {player.location && <p>{player.location}</p>}
                  <p>Estat: {player.status}</p>
                </div>
              </div>

              <div className="profile-details">
                <p>
                  <strong>Followers:</strong> {player.followers}
                </p>
                <p>
                  <strong>Joined:</strong> {player.joined}
                </p>
                <p>
                  <strong>Last online:</strong> {player.last_online}
                </p>

                {player.twitch_url && (
                  <p>
                    <strong>Twitch:</strong>{" "}
                    <a
                      href={player.twitch_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {player.twitch_url}
                    </a>
                  </p>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default Profile;
