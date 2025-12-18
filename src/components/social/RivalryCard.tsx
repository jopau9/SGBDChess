import { useEffect, useState } from "react";
import { getRivalryStats, type RivalryStats } from "../../libs/chess";
import "./RivalryCard.css";

type RivalryCardProps = {
    myChessUsername: string;
    opponentChessUsername: string;
    currentUserAvatar?: string; // To allow showing both avatars properly if desired
    opponentAvatar?: string;
};

export default function RivalryCard({
    myChessUsername,
    opponentChessUsername,
    opponentAvatar
}: RivalryCardProps) {
    const [stats, setStats] = useState<RivalryStats | null>(null);
    const [myAvatar, setMyAvatar] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (myChessUsername && opponentChessUsername) {
            setLoading(true);

            // Fetch stats and my avatar in parallel
            Promise.all([
                getRivalryStats(myChessUsername, opponentChessUsername),
                fetch(`https://api.chess.com/pub/player/${myChessUsername}`).then(res => res.json()).catch(() => ({}))
            ])
                .then(([statsData, playerData]) => {
                    setStats(statsData);
                    setMyAvatar(playerData.avatar || null);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [myChessUsername, opponentChessUsername]);

    if (loading) return null;

    if (!stats || stats.total === 0) return null;

    // Calculate percentages for the bar
    const winPct = (stats.wins / stats.total) * 100;
    const lossPct = (stats.losses / stats.total) * 100;
    const drawPct = (stats.draws / stats.total) * 100;

    return (
        <div className={`rivalry-card animate-fade-in ${expanded ? "expanded" : ""}`}>
            <div className="rivalry-top">
                {/* My Player */}
                <div className="player-side">
                    <div className="avatar-wrapper">
                        {myAvatar ? <img src={myAvatar} alt={myChessUsername} /> : <div className="avatar-placeholder">{myChessUsername[0].toUpperCase()}</div>}
                    </div>
                    <span className="username">{myChessUsername}</span>
                </div>

                {/* VS Badge */}
                <div className="vs-badge">
                    <span>VS</span>
                </div>

                {/* Opponent */}
                <div className="player-side">
                    <div className="avatar-wrapper">
                        {opponentAvatar ? <img src={opponentAvatar} alt={opponentChessUsername} /> : <div className="avatar-placeholder">{opponentChessUsername[0].toUpperCase()}</div>}
                    </div>
                    <span className="username">{opponentChessUsername}</span>
                </div>
            </div>

            <div className="rivalry-score-bar">
                <div className="score-segment win" style={{ width: `${winPct}%` }}></div>
                <div className="score-segment draw" style={{ width: `${drawPct}%` }}></div>
                <div className="score-segment loss" style={{ width: `${lossPct}%` }}></div>
            </div>

            <div className="rivalry-stats-text">
                <div className="stat win">
                    <span className="value">{stats.wins}</span>
                    <span className="label">WIN</span>
                </div>
                <div className="stat draw">
                    <span className="value">{stats.draws}</span>
                    <span className="label">DRAW</span>
                </div>
                <div className="stat loss">
                    <span className="value">{stats.losses}</span>
                    <span className="label">LOSS</span>
                </div>
            </div>

            {expanded && stats.detailed && (
                <div className="rivalry-details animate-fade-in">
                    <div className="details-grid">
                        <div className="details-header">Type</div>
                        <div className="details-header">W</div>
                        <div className="details-header">L</div>
                        <div className="details-header">D</div>

                        {Object.entries(stats.detailed).map(([type, s]) => (
                            <>
                                <div className="details-cell type">{type}</div>
                                <div className="details-cell val win">{s.wins}</div>
                                <div className="details-cell val loss">{s.losses}</div>
                                <div className="details-cell val draw">{s.draws}</div>
                            </>
                        ))}
                    </div>
                </div>
            )}

            <button
                className="rivalry-expand-btn"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? "Menys detalls" : "Més detalls"}
            </button>
        </div>
    );
}
