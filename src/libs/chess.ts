import { db } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";

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

export function formatUnixDate(ts?: number): string {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    return d.toISOString().slice(0, 10);
}

export async function fetchPlayerFromChess(username: string): Promise<Player | null> {
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

export async function fetchPlayerStatsFromChess(
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

export const ECO_BOOK: Record<string, string> = {
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

export function extractOpeningFromPGN(pgn: string): { opening: string; eco: string | null } {
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

export type StatsByTimeClass = Record<string, { wins: number; losses: number; draws: number; total: number }>;

export type RivalryStats = {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    games: any[]; // List of games between them
    detailed?: StatsByTimeClass; // Breakdown by time control
};

export async function getRivalryStats(
    myUsername: string,
    opponentUsername: string
): Promise<RivalryStats> {
    const archives = await fetchArchives(opponentUsername);
    // Limit to last 24 archives (2 years approx) to avoid too many requests?
    // Or just fetch all. Let's try last 12 for speed.
    const recentArchives = archives.reverse().slice(0, 12);

    let wins = 0;
    let losses = 0;
    let draws = 0;
    const rivalryGames: any[] = [];
    const detailed: StatsByTimeClass = {};

    const myUser = myUsername.toLowerCase();

    // Process parallel requests? 
    // Browser limit is 6 connections usually.
    // Let's do batches of 3.
    // actually, simpler loop for now.

    for (const url of recentArchives) {
        const games = await fetchGamesFromArchive(url);

        for (const g of games) {
            const white = g.white.username.toLowerCase();
            const black = g.black.username.toLowerCase();

            if (white === myUser || black === myUser) {
                // Found a match!
                rivalryGames.push(g);

                const isWhite = white === myUser;
                const result = isWhite ? g.white.result : g.black.result;
                const timeClass = g.time_class || "unknown"; // rapid, blitz, bullet, daily...

                // Init time class stats if needed
                if (!detailed[timeClass]) {
                    detailed[timeClass] = { wins: 0, losses: 0, draws: 0, total: 0 };
                }

                let isWin = false;
                let isLoss = false;
                let isDraw = false;

                if (result === "win") {
                    wins++;
                    isWin = true;
                }
                else if (["checkmated", "timeout", "resigned", "abandoned"].includes(result)) {
                    losses++;
                    isLoss = true;
                }
                else {
                    draws++;
                    isDraw = true;
                }

                // Update detailed stats
                detailed[timeClass].total++;
                if (isWin) detailed[timeClass].wins++;
                if (isLoss) detailed[timeClass].losses++;
                if (isDraw) detailed[timeClass].draws++;
            }
        }
    }

    return {
        wins,
        losses,
        draws,
        total: wins + losses + draws,
        games: rivalryGames,
        detailed
    };
}

export async function saveGamesToFirebase(username: string, games: any[]) {
    const gamesRef = collection(db, "games");

    for (const g of games) {
        const id = safeGameId(g, username);

        const docRef = doc(gamesRef, id);

        const isWhite =
            g.white?.username?.toLowerCase() === username.toLowerCase();
        const side = isWhite ? g.white : g.black;
        const opp = isWhite ? g.black : g.white;

        const { opening, eco } = extractOpeningFromPGN(g.pgn || "");

        if (opening === "Unknown Opening") continue;

        let opponentName = opp?.username;

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

export async function fetchArchives(username: string) {
    const url = `https://api.chess.com/pub/player/${username}/games/archives`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.archives || [];
}

export async function fetchGamesFromArchive(archiveUrl: string) {
    const res = await fetch(archiveUrl);
    if (!res.ok) return [];
    const data = await res.json();
    return data.games || [];
}

export async function fetchRecentGames(
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

export function safeGameId(g: any, username: string) {
    if (g.url) {
        const parts = g.url.split("/");
        return parts[parts.length - 1]; // últim segment
    }
    return `${username}-${g.end_time}`;
}

export function countMoves(pgn: string): number {
    if (!pgn) return 0;
    // Match move numbers "1.", "2.", etc.
    const matches = pgn.match(/\d+\./g);
    return matches ? matches.length : 0;
}

export function extractFirstMove(pgn: string): string {
    if (!pgn) return "—";

    // Captura el primer moviment després de "1."
    const match = pgn.match(/^1\.\s*([a-h][1-8]|[NBRQK][a-h][1-8])/m);

    return match ? match[1] : "—";
}

export function resolveOpponentName(pgn: string, currentUsername: string): string | null {
    if (!pgn) return null;

    const whiteMatch = pgn.match(/\[White\s+"([^"]+)"\]/i);
    const blackMatch = pgn.match(/\[Black\s+"([^"]+)"\]/i);

    const whiteName = whiteMatch ? whiteMatch[1] : null;
    const blackName = blackMatch ? blackMatch[1] : null;

    if (whiteName?.toLowerCase() === currentUsername.toLowerCase()) return blackName;
    if (blackName?.toLowerCase() === currentUsername.toLowerCase()) return whiteName;

    return null;
}
