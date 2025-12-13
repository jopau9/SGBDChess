import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { db } from "../../libs/firebase";
import { doc, getDoc } from "firebase/firestore";
import Header from "../../components/layout/Header";
import "./GameDetails.css";

export default function GameDetails() {
    const { gameId } = useParams<{ gameId: string }>();
    const location = useLocation();
    const fromTopGames = location.state?.fromTopGames;

    const [game, setGame] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadGame() {
            if (!gameId) return;
            try {
                setLoading(true);
                const docRef = doc(db, "games", gameId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    setGame(snap.data());
                } else {
                    setError("Partida no trobada.");
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError("Error carregant la partida.");
                setLoading(false);
            }
        }

        loadGame();
    }, [gameId]);

    if (loading) return <div className="game-details-loading"><div className="spinner"></div><p>Carregant partida...</p></div>;
    if (error) return <div className="game-details-error"><p>{error}</p><Link to="/" className="btn-back">Tornar</Link></div>;
    if (!game) return null;

    const isWin = game.result === "win";
    const isLoss = ["checkmated", "resigned", "timeout", "abandoned"].includes(game.result);
    // const isDraw = !isWin && !isLoss; // Unused

    let resultClass = isWin ? "win" : isLoss ? "loss" : "draw";
    let resultEmoji = getResultEmoji(game.result);

    // Logic for result text
    let resultText = translateResult(game.result);
    if (fromTopGames) {
        resultClass = "top-game"; // Blue theme
        resultEmoji = "🤝"; // Handshake / Waving hands

        if (isWin) {
            resultText = `VICTÒRIA PER A ${game.username.toUpperCase()}`;
        } else if (isLoss) {
            resultText = `VICTÒRIA PER A ${(game.opponent_username || "OPONENT").toUpperCase()}`;
        } else {
            resultText = "EMPAT";
        }
    }

    return (
        <div className={`game-details-page ${resultClass}`}>
            <Header />
            <div className="game-details-container">
                <div className="game-details-overlay">
                    <header className="game-content-header">
                        <Link to={fromTopGames ? "/stats" : `/profile/${game.username}`} className="back-link-button">
                            ← {fromTopGames ? "Tornar a l'inici" : "Tornar al perfil"}
                        </Link>
                        <div className="game-date">
                            📅 {game.timestamp ? new Date(game.timestamp * 1000).toLocaleDateString() : "Data desconeguda"}
                        </div>
                    </header>

                    <main className="game-content">
                        <div className="result-hero">
                            <div className="result-icon">{resultEmoji}</div>
                            <h1 className="result-title">{resultText}</h1>
                            <p className="result-subtitle">{game.opening}</p>
                        </div>

                        <div className="players-showcase">
                            {/* Player Card (Hero) */}
                            <div className={`player-card hero ${game.color === "white" ? "white-piece" : "black-piece"}`}>
                                <div className="player-avatar-placeholder">
                                    {game.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="player-info">
                                    <h2>{game.username}</h2>
                                    <span className="player-rating">Rating: ???</span>
                                    <div className="piece-indicator">{game.color === "white" ? "♔ White" : "♚ Black"}</div>
                                </div>
                                {isWin && <div className="winner-badge">WINNER</div>}
                            </div>

                            <div className="vs-divider">VS</div>

                            {/* Opponent Card */}
                            <div className={`player-card opponent ${game.color === "white" ? "black-piece" : "white-piece"}`}>
                                <div className="player-avatar-placeholder opponent">
                                    {(game.opponent_username || "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="player-info">
                                    <h2>{game.opponent_username || "Unknown"}</h2>
                                    <span className="player-rating">Rating: {game.opponent_rating || "?"}</span>
                                    <div className="piece-indicator">{game.color === "white" ? "♚ Black" : "♔ White"}</div>
                                </div>
                                {isLoss && <div className="winner-badge">WINNER</div>}
                            </div>
                        </div>

                        <div className="game-stats-bar">
                            <div className="stat-item">
                                <span className="stat-icon">⏱️</span>
                                <span className="stat-label">Temps</span>
                                <span className="stat-value">{game.time_class}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-icon">♟️</span>
                                <span className="stat-label">Moviments</span>
                                <span className="stat-value">{game.move_count}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-icon">📜</span>
                                <span className="stat-label">ECO</span>
                                <span className="stat-value">{game.eco || "—"}</span>
                            </div>
                        </div>

                        <div className="game-actions">
                            {game.url && (
                                <a href={game.url} target="_blank" rel="noreferrer" className="action-btn primary">
                                    ♟️ Veure a Chess.com
                                </a>
                            )}
                            {game.pgn && (
                                <button
                                    className="action-btn secondary"
                                    onClick={() => navigator.clipboard.writeText(game.pgn)}
                                >
                                    📋 Copiar PGN
                                </button>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

function translateResult(result: string): string {
    const map: Record<string, string> = {
        win: "VICTÒRIA",
        checkmated: "ESCAC I MAT",
        resigned: "ABANDONAMENT",
        timeout: "TEMPS ESGOTAT",
        stalemate: "OFEGAT",
        insufficient: "MATERIAL INSUFICIENT",
        repetition: "REPETICIÓ",
        agreement: "ACORD",
        abandoned: "ABANDONAT",
        timevsinsufficient: "TEMPS VS INSUFICIENT"
    };
    return map[result] || result?.toUpperCase();
}

function getResultEmoji(result: string): string {
    if (result === "win") return "🏆";
    if (["checkmated", "resigned", "timeout", "abandoned"].includes(result)) return "💀";
    return "🤝";
}
