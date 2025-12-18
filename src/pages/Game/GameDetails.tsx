import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { db } from "../../libs/firebase";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Header from "../../components/layout/Header";
import "./GameDetails.css";
import { processGameAnalysis } from "../../libs/chessAnalysis";

export default function GameDetails() {
    const { gameId } = useParams<{ gameId: string }>();
    const location = useLocation();
    const fromTopGames = location.state?.fromTopGames;
    const { currentUser } = useAuth(); // Access auth state

    const [game, setGame] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track analysis state separately to show loading in that specific section
    const [analyzing, setAnalyzing] = useState(false);

    // Shows "Login required" instead of auto-analyzing
    const [loginRequiredForAnalysis, setLoginRequiredForAnalysis] = useState(false);

    useEffect(() => {
        async function loadGame() {
            if (!gameId) return;
            try {
                setLoading(true);
                const docRef = doc(db, "games", gameId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    setGame(data);

                    // Trigger analysis if missing opening OR accuracy OR extended analysis
                    if (data.pgn && (!data.opening || !data.accuracy || !data.analysis)) {
                        // Only trigger if USER IS LOGGED IN
                        if (currentUser) {
                            triggerAnalysis(data.pgn, docRef);
                        } else {
                            // Guest mode: Do NOT trigger analysis, show prompts instead
                            setLoginRequiredForAnalysis(true);
                        }
                    }
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
    }, [gameId]); // Only re-run if gameId changes

    const triggerAnalysis = async (pgn: string, docRef: any) => {
        setAnalyzing(true);
        try {
            console.log("Starting background analysis...");
            const results = await processGameAnalysis(pgn);

            // Save to Firebase
            await updateDoc(docRef, {
                opening: results.opening,
                accuracy: results.accuracy,
                analysis: results.analysis, // Add extended analysis
                processedAt: results.processedAt
            });

            // Update local state
            setGame((prev: any) => ({
                ...prev,
                opening: results.opening,
                accuracy: results.accuracy,
                analysis: results.analysis
            }));
        } catch (error) {
            console.error("Analysis failed:", error);
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <div className="game-details-loading"><div className="spinner"></div><p>Carregant partida...</p></div>;
    if (error) return <div className="game-details-error"><p>{error}</p><Link to="/" className="btn-back">Tornar</Link></div>;
    if (!game) return null;

    const isWin = game.result === "win";
    const isLoss = ["checkmated", "resigned", "timeout", "abandoned"].includes(game.result);

    let resultClass = isWin ? "win" : isLoss ? "loss" : "draw";
    let resultEmoji = getResultEmoji(game.result);
    let resultText = translateResult(game.result);

    if (fromTopGames) {
        resultClass = "top-game";
        resultEmoji = "🤝";
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

                        {/* NEW GAME ANALYSIS SECTION */}
                        <div className="game-analysis-section">
                            <h3>🔍 Game Analysis</h3>

                            {loginRequiredForAnalysis && !game.analysis ? (
                                <div className="analysis-locked-box">
                                    <p>🔒 Inicia sessió per generar un anàlisi detallat (precisió, blunders, etc).</p>
                                    <Link to="/login" className="btn-login-small">Iniciar Sessió</Link>
                                </div>
                            ) : analyzing ? (
                                <div className="analysis-loading">
                                    <div className="spinner-small"></div>
                                    <p>Processant partida (Analitzant PGN)...</p>
                                </div>
                            ) : (
                                <div className="analysis-content">
                                    <div className="analysis-item opening">
                                        <span className="label">Obertura</span>
                                        <span className="value">{game.opening || "—"}</span>
                                    </div>
                                    <div className="accuracy-meters">
                                        <div className="accuracy-item">
                                            <span className="label">{game.username}</span>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar fill-hero"
                                                    style={{ width: `${game.accuracy?.white || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="score">{game.accuracy?.white ?? "—"}%</span>
                                        </div>
                                        <div className="accuracy-item">
                                            <span className="label">{game.opponent_username || "Opponent"}</span>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar fill-opponent"
                                                    style={{ width: `${game.accuracy?.black || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="score">{game.accuracy?.black ?? "—"}%</span>
                                        </div>
                                    </div>

                                    {/* EXTENDED STATS GRID */}
                                    {game.analysis && (
                                        <div className="analysis-grid">
                                            <div className="analysis-stat-box">
                                                <span className="stat-label">Possibles Blunders</span>
                                                <div className="stat-values-row">
                                                    <span className="val-white">⚪ {game.analysis.blunders?.white ?? 0}</span>
                                                    <span className="val-divider">|</span>
                                                    <span className="val-black">⚫ {game.analysis.blunders?.black ?? 0}</span>
                                                </div>
                                            </div>

                                            <div className="analysis-stat-box">
                                                <span className="stat-label">Agressivitat</span>
                                                <div className="stat-values-row">
                                                    <span className="val-white">{game.analysis.aggressiveness?.white ?? 0}%</span>
                                                    <span className="val-divider">vs</span>
                                                    <span className="val-black">{game.analysis.aggressiveness?.black ?? 0}%</span>
                                                </div>
                                            </div>

                                            <div className="analysis-stat-box">
                                                <span className="stat-label">Captures / Xecs</span>
                                                <div className="stat-values-row">
                                                    <span className="val-white">⚔️ {game.analysis.captures?.white}</span>
                                                    <span className="val-black">💥 {game.analysis.checks?.white}</span>
                                                </div>
                                                <div className="stat-values-row">
                                                    <span className="val-white">⚔️ {game.analysis.captures?.black}</span>
                                                    <span className="val-black">💥 {game.analysis.checks?.black}</span>
                                                </div>
                                            </div>

                                            <div className="analysis-stat-box">
                                                <span className="stat-label">Material Final</span>
                                                <span className="stat-value-single">
                                                    {game.analysis.materialDiff > 0
                                                        ? `+${game.analysis.materialDiff} (White)`
                                                        : game.analysis.materialDiff < 0
                                                            ? `+${Math.abs(game.analysis.materialDiff)} (Black)`
                                                            : "Equal"}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
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
