// src/pages/Statistics/Sections/GlobalInsightsSection.tsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../libs/firebase.ts";

type GameDoc = {
    username: string;
    timestamp?: number | null;
    opening: string;
    eco?: string | null;
    color: "white" | "black" | string;
    result: string;
    opponent_rating?: number | null;
    first_move?: string;
    time_class?: string;
};

type GlobalInsights = {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    whiteGames: number;
    blackGames: number;
    whiteWins: number;
    blackWins: number;
    globalWinrate: string;
    whiteWinrate: string;
    blackWinrate: string;
    avgOpponentElo: number | null;
    resultCounts: Record<string, number>;
    topFirstMoves: { move: string; count: number }[];
};

export default function GlobalInsightsSection() {
    const [insights, setInsights] = useState<GlobalInsights | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);

            const snap = await getDocs(collection(db, "games"));
            const allGames = snap.docs.map((d) => d.data() as GameDoc);

            let totalGames = 0;
            let wins = 0;
            let losses = 0;
            let draws = 0;

            let whiteGames = 0;
            let blackGames = 0;
            let whiteWins = 0;
            let blackWins = 0;

            let opponentRatingSum = 0;
            let opponentRatingCount = 0;

            const resultCounts: Record<string, number> = {};
            const firstMoves: Record<string, number> = {};

            for (const g of allGames) {
                totalGames++;

                const result = g.result || "unknown";

                if (g.color === "white") whiteGames++;
                if (g.color === "black") blackGames++;

                const oppRating = g.opponent_rating || 0;
                if (oppRating > 0) {
                    opponentRatingSum += oppRating;
                    opponentRatingCount++;
                }

                let outcome: "win" | "loss" | "draw" | "other" = "other";

                if (result === "win") {
                    outcome = "win";
                } else if (
                    ["checkmated", "resigned", "timeout", "lose"].includes(result)
                ) {
                    outcome = "loss";
                } else if (
                    [
                        "agreed",
                        "stalemate",
                        "repetition",
                        "insufficient",
                        "50move",
                        "timevsinsufficient",
                        "draw",
                    ].includes(result)
                ) {
                    outcome = "draw";
                }

                if (outcome === "win") {
                    wins++;
                    if (g.color === "white") whiteWins++;
                    if (g.color === "black") blackWins++;
                } else if (outcome === "loss") {
                    losses++;
                } else if (outcome === "draw") {
                    draws++;
                }

                resultCounts[result] = (resultCounts[result] || 0) + 1;

                const move = g.first_move || "—";
                if (move !== "—") {
                    firstMoves[move] = (firstMoves[move] || 0) + 1;
                }
            }

            const totalPlayed = wins + losses + draws;
            const globalWinrate =
                totalPlayed > 0 ? ((wins / totalPlayed) * 100).toFixed(1) : "0.0";

            const whiteWinrate =
                whiteGames > 0 ? ((whiteWins / whiteGames) * 100).toFixed(1) : "0.0";

            const blackWinrate =
                blackGames > 0 ? ((blackWins / blackGames) * 100).toFixed(1) : "0.0";

            const avgOpponentElo =
                opponentRatingCount > 0
                    ? Math.round(opponentRatingSum / opponentRatingCount)
                    : null;

            const topFirstMoves = Object.entries(firstMoves)
                .map(([move, count]) => ({ move, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            setInsights({
                totalGames,
                wins,
                losses,
                draws,
                whiteGames,
                blackGames,
                whiteWins,
                blackWins,
                globalWinrate,
                whiteWinrate,
                blackWinrate,
                avgOpponentElo,
                resultCounts,
                topFirstMoves,
            });

            setLoading(false);
        }

        load();
    }, []);

    if (loading || !insights) {
        return <p>Carregant Global Insights…</p>;
    }

    const { resultCounts, topFirstMoves } = insights;

    return (
        <div className="insights-wrapper">
            <div className="insights-grid">
                <div className="insights-card primary">
                    <h4>Total de partides</h4>
                    <p className="value">{insights.totalGames}</p>
                    <small>Sumant totes les partides guardades a ChessStats</small>
                </div>

                <div className="insights-card">
                    <h4>Winrate global</h4>
                    <p className="value">{insights.globalWinrate}%</p>
                    <small>
                        W:{insights.wins} / L:{insights.losses} / D:{insights.draws}
                    </small>
                </div>

                <div className="insights-card">
                    <h4>Blanques</h4>
                    <p className="value">{insights.whiteWinrate}%</p>
                    <small>
                        {insights.whiteGames} partides com a blanques, {insights.whiteWins} victòries
                    </small>
                </div>

                <div className="insights-card">
                    <h4>Negres</h4>
                    <p className="value">{insights.blackWinrate}%</p>
                    <small>
                        {insights.blackGames} partides com a negres, {insights.blackWins} victòries
                    </small>
                </div>

                <div className="insights-card">
                    <h4>Elo mitjà dels oponents</h4>
                    <p className="value">
                        {insights.avgOpponentElo ? insights.avgOpponentElo : "—"}
                    </p>
                    <small>Mitjana sobre totes les partides analitzades</small>
                </div>
            </div>

            <div className="insights-subsection">
                <h4 className="insights-subtitle">Distribució de resultats</h4>
                <table className="insights-table">
                    <thead>
                        <tr>
                            <th>Resultat</th>
                            <th>Partides</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(resultCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([result, count]) => (
                                <tr key={result}>
                                    <td>{result}</td>
                                    <td>{count}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            <div className="insights-subsection">
                <h4 className="insights-subtitle">Moviments inicials més comuns</h4>
                <table className="insights-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Moviment</th>
                            <th>Partides</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topFirstMoves.map((m, idx) => (
                            <tr key={m.move}>
                                <td>{idx + 1}</td>
                                <td>{m.move}</td>
                                <td>{m.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
