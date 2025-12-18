import React, { useEffect, useState, Component, type ReactNode } from "react";
import { db } from "../../libs/firebase";
import { collection, getDocs } from "firebase/firestore";

// Simple Error Boundary to catch render errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("SummaryPage Render Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: "red", background: "white", height: "100vh" }}>
                    <h1>Something went wrong rendering the summary.</h1>
                    <pre>{this.state.error?.toString()}</pre>
                    <pre>{this.state.error?.stack}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

function SummaryContent() {
    const [status, setStatus] = useState("init");
    const [data, setData] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        setStatus("loading");
        async function fetchData() {
            try {
                // 1. Fetch Users
                const usersSnap = await getDocs(collection(db, "usuaris"));
                const users = usersSnap.docs.map((d) => d.data());
                users.sort((a: any, b: any) => (a.joined || 0) - (b.joined || 0));

                // 2. Fetch Games
                const gamesSnap = await getDocs(collection(db, "games"));
                const games = gamesSnap.docs.map((d) => d.data());
                games.sort((a: any, b: any) => (b.end_time || 0) - (a.end_time || 0));

                // 3. Calculate Global Stats
                let totalGames = 0;
                let whiteWins = 0;
                let blackWins = 0;
                let draws = 0;
                let totalElo = 0;
                let ratedGamesCount = 0;
                const openings: Record<string, number> = {};

                games.forEach((g: any) => {
                    totalGames++;

                    const whiteResult = g.white?.result;
                    const blackResult = g.black?.result;

                    if (whiteResult === "win") whiteWins++;
                    else if (blackResult === "win") blackWins++;
                    else draws++;

                    const wRating = Number(g.white?.rating);
                    const bRating = Number(g.black?.rating);

                    if (!isNaN(wRating) && !isNaN(bRating) && wRating > 0 && bRating > 0) {
                        totalElo += (wRating + bRating) / 2;
                        ratedGamesCount++;
                    }

                    const openingName = g.opening?.name || "Unknown";
                    openings[openingName] = (openings[openingName] || 0) + 1;
                });

                const avgElo = ratedGamesCount > 0 ? Math.round(totalElo / ratedGamesCount) : 0;

                const sortedOpenings = Object.entries(openings)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10);

                setData({
                    users,
                    games,
                    stats: {
                        totalGames,
                        whiteWins,
                        blackWins,
                        draws,
                        avgElo,
                        sortedOpenings
                    }
                });
                setStatus("success");
            } catch (error: any) {
                console.error("Error fetching summary data:", error);
                setErrorMsg(error.message || "Unknown error");
                setStatus("error");
            }
        }

        fetchData();
    }, []);

    const containerStyle: React.CSSProperties = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "white",
        color: "black",
        zIndex: 2147483647,
        overflow: "auto",
        padding: "20px",
        fontFamily: "monospace",
        boxSizing: "border-box",
        whiteSpace: "pre-wrap"
    };

    const safeDate = (timestamp: any) => {
        if (!timestamp) return "N/A";
        try {
            const date = new Date(timestamp * 1000);
            if (isNaN(date.getTime())) return "Invalid Date";
            return date.toISOString();
        } catch (e) {
            return "Error Date";
        }
    };

    if (status === "loading") return <div style={containerStyle}>Loading full system dump...</div>;
    if (status === "error") return <div style={containerStyle}><h1 style={{ color: "red" }}>Error</h1><p>{errorMsg}</p></div>;
    if (!data) return <div style={containerStyle}>No data found.</div>;

    return (
        <div style={containerStyle}>
            <h1>System Data Dump</h1>
            <p>Timestamp: {new Date().toISOString()}</p>

            <hr style={{ border: "1px solid black" }} />

            <h2>1. GLOBAL STATISTICS</h2>
            <div>
                <strong>Total Games:</strong> {data.stats.totalGames}<br />
                <strong>Results:</strong> White Wins: {data.stats.whiteWins} | Black Wins: {data.stats.blackWins} | Draws: {data.stats.draws}<br />
                <strong>Average ELO:</strong> {data.stats.avgElo}<br />
                <strong>Top 10 Openings:</strong><br />
                {data.stats.sortedOpenings.map(([name, count]: any) => `  - ${name}: ${count}`).join("\n")}
            </div>

            <hr style={{ border: "1px solid black" }} />

            <h2>2. USERS ({data.users.length})</h2>
            {data.users.map((u: any, i: number) => (
                <div key={i} style={{ marginBottom: "20px", border: "1px solid #ccc", padding: "10px" }}>
                    <strong>#{i + 1} {u.username}</strong><br />
                    - Name: {u.name || "N/A"}<br />
                    - Location: {u.location || "N/A"}<br />
                    - Joined: {safeDate(u.joined)}<br />
                    - Followers: {u.followers}<br />
                    <strong>Stats:</strong><br />
                    {u.stats ? (
                        <>
                            Rapid: {u.stats.rapid?.rating} ({u.stats.rapid?.games} games)<br />
                            Blitz: {u.stats.blitz?.rating} ({u.stats.blitz?.games} games)<br />
                            Bullet: {u.stats.bullet?.rating} ({u.stats.bullet?.games} games)<br />
                        </>
                    ) : "No stats available"}
                </div>
            ))}

            <hr style={{ border: "1px solid black" }} />

            <h2>3. ALL GAMES ({data.games.length})</h2>
            {data.games.map((g: any, i: number) => (
                <div key={i} style={{ marginBottom: "10px", borderBottom: "1px dashed #ccc", paddingBottom: "5px" }}>
                    <strong>Game #{data.games.length - i}</strong> [{safeDate(g.end_time)}]<br />
                    <strong>{g.white?.username || "?"} vs {g.black?.username || "?"}</strong><br />
                    Result: {g.white?.result === "win" ? "1-0" : g.black?.result === "win" ? "0-1" : "1/2"}<br />
                    Opening: {g.opening?.name || "Unknown"}<br />
                    PGN: {g.pgn ? g.pgn.replace(/\n/g, " ") : "No PGN"}<br />
                </div>
            ))}
        </div>
    );
}

export default function SummaryPage() {
    return (
        <ErrorBoundary>
            <SummaryContent />
        </ErrorBoundary>
    );
}
