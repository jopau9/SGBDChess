import { collection, getDocs } from "firebase/firestore";
import { db } from "../../libs/firebase";

export type CommunityStats = {
  avgRatings: {
    rapid: number | null;
    blitz: number | null;
    bullet: number | null;
    daily: number | null;
  };
  modeDistribution: {
    rapid: number;
    blitz: number;
    bullet: number;
    daily: number;
  };
  mostPlayedMode: string | null;
  activeLast7Days: number;
  totalPlayers: number;
  communityStyle: string;
  playerStyleMatch: string;
};

export async function computeCommunityStats(currentUsername: string): Promise<CommunityStats> {
  const snap = await getDocs(collection(db, "usuaris"));
  const players = snap.docs.map((d) => d.data());

  let rapidRatings: number[] = [];
  let blitzRatings: number[] = [];
  let bulletRatings: number[] = [];
  let dailyRatings: number[] = [];

  let modeCount = { rapid: 0, blitz: 0, bullet: 0, daily: 0 };

  let activeLast7Days = 0;

  const now = Date.now();

  // ---- RECORREGUT GENERAL ----
  for (const p of players) {
    const stats = p.stats ?? null;

    if (p.last_online) {
      const last = typeof p.last_online === "string" ? new Date(p.last_online).getTime() : 0;
      if (now - last < 7 * 24 * 3600 * 1000) activeLast7Days++;
    }

    if (stats?.rapid?.rating) {
      rapidRatings.push(stats.rapid.rating);
      modeCount.rapid++;
    }
    if (stats?.blitz?.rating) {
      blitzRatings.push(stats.blitz.rating);
      modeCount.blitz++;
    }
    if (stats?.bullet?.rating) {
      bulletRatings.push(stats.bullet.rating);
      modeCount.bullet++;
    }
    if (stats?.daily?.rating) {
      dailyRatings.push(stats.daily.rating);
      modeCount.daily++;
    }
  }

  // ---- MITJANES ----
  const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

  const avgRatings = {
    rapid: avg(rapidRatings),
    blitz: avg(blitzRatings),
    bullet: avg(bulletRatings),
    daily: avg(dailyRatings),
  };

  // ---- MODALITAT MÉS FREQUENT ----
  const entries = Object.entries(modeCount);
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const mostPlayedMode = sorted[0]?.[0] ?? null;

  // ---- ESTIL DEL SISTEMA ----
  const totalModes = Object.values(modeCount).reduce((a, b) => a + b, 0);
  const communityStyle =
    modeCount.blitz / totalModes > 0.45
      ? "Comunitat enfocada a Blitz"
      : modeCount.rapid / totalModes > 0.45
      ? "Comunitat metòdica (Rapid dominant)"
      : "Comunitat diversa";

  // ---- ESTIL DEL JUGADOR ----
  const current = players.find((p) => p.username === currentUsername);
  let playerStyleMatch = "No hi ha dades suficients.";

  if (current?.stats) {
    const st = current.stats;
    const modeTotals = {
      rapid: st.rapid?.games ?? 0,
      blitz: st.blitz?.games ?? 0,
      bullet: st.bullet?.games ?? 0,
      daily: st.daily?.games ?? 0,
    };

    const topMode = Object.entries(modeTotals).sort((a, b) => b[1] - a[1])[0]?.[0];

    playerStyleMatch =
      topMode === mostPlayedMode
        ? "El teu estil coincideix amb la comunitat."
        : "El teu estil és diferent del patró de la comunitat.";
  }

  return {
    avgRatings,
    modeDistribution: modeCount,
    mostPlayedMode,
    activeLast7Days,
    totalPlayers: players.length,
    communityStyle,
    playerStyleMatch,
  };
}
