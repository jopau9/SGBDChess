import React, { useEffect, useState, Component, type ReactNode } from "react";
import { db } from "../../libs/firebase";
import { collection, getDocs } from "firebase/firestore";

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
                    <h1>Error generating knowledge base.</h1>
                    <pre>{this.state.error?.toString()}</pre>
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
                let users = usersSnap.docs.map((d) => d.data());

                // Calculate max rating for each user and sort by it
                users = users.map((u: any) => {
                    const rapid = u.stats?.rapid?.rating || 0;
                    const blitz = u.stats?.blitz?.rating || 0;
                    const bullet = u.stats?.bullet?.rating || 0;
                    const maxRating = Math.max(rapid, blitz, bullet);
                    return { ...u, maxRating };
                });

                users.sort((a: any, b: any) => b.maxRating - a.maxRating);

                // 2. Fetch Games (Only for Global Stats)
                const gamesSnap = await getDocs(collection(db, "games"));
                const games = gamesSnap.docs.map((d) => d.data());

                // Calculate Global Stats
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

                    const openingName = g.opening?.name || "Unknown Opening";
                    openings[openingName] = (openings[openingName] || 0) + 1;
                });

                const avgElo = ratedGamesCount > 0 ? Math.round(totalElo / ratedGamesCount) : 0;
                const sortedOpenings = Object.entries(openings).sort(([, a], [, b]) => b - a).slice(0, 10);

                setData({ users, stats: { totalGames, whiteWins, blackWins, draws, avgElo, sortedOpenings } });
                setStatus("success");
            } catch (error: any) {
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
        color: "#1a1a1a",
        zIndex: 2147483647,
        overflow: "auto",
        padding: "40px",
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        lineHeight: "1.6",
        boxSizing: "border-box"
    };

    const safeDate = (val: any) => {
        if (!val) return "an unknown date";

        let date;
        // Check if it's a string that looks like a date (YYYY-MM-DD or ISO)
        if (typeof val === "string" && (val.includes("-") || val.includes("/"))) {
            date = new Date(val);
        } else if (typeof val === "number") {
            // Assume unix timestamp in seconds
            date = new Date(val * 1000);
        } else if (val && typeof val === "object" && val.seconds) {
            // Firestore Timestamp
            date = new Date(val.seconds * 1000);
        } else {
            // Fallback or try parsing directly
            date = new Date(val);
        }

        if (isNaN(date.getTime())) return "an invalid date";
        return date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (status === "loading") return <div style={containerStyle}>Generating system knowledge base...</div>;
    if (status === "error") return <div style={containerStyle}><h1 style={{ color: "red" }}>Error</h1><p>{errorMsg}</p></div>;
    if (!data) return <div style={containerStyle}>No data found.</div>;

    return (
        <div style={containerStyle}>
            <h1>SGBD Chess System Knowledge Base</h1>
            <p><em>This document provides a concise summary of the SGBD Chess system, focusing on the player leaderboard.</em></p>

            <hr />

            <h2>1. Global Statistics</h2>
            <p>
                The database contains <strong>{data.stats.totalGames} total matches</strong> with an average player rating of <strong>{data.stats.avgElo}</strong>.
                Outcomes: {data.stats.whiteWins} White wins, {data.stats.blackWins} Black wins, and {data.stats.draws} draws.
            </p>
            <p>
                <strong>Top Openings:</strong> {data.stats.sortedOpenings.map(([name, count]: any) => `${name} (${count})`).join(", ")}.
            </p>

            <hr />

            <h2>2. Player Leaderboard</h2>
            <p>The following list ranks all {data.users.length} registered users based on their highest chess rating (Rapid, Blitz, or Bullet).</p>

            {data.users.map((u: any, i: number) => (
                <div key={i} style={{ marginBottom: "1em" }}>
                    <p>
                        <strong>Rank #{i + 1}: {u.username}</strong>
                        <br />
                        Located in {u.location || "Unknown Location"}. Joined on {safeDate(u.joined)}.
                        <br />
                        <strong>Highest Rating: {u.maxRating}</strong>.
                        {u.stats?.rapid?.rating ? ` Rapid: ${u.stats.rapid.rating}.` : ""}
                        {u.stats?.blitz?.rating ? ` Blitz: ${u.stats.blitz.rating}.` : ""}
                        {u.stats?.bullet?.rating ? ` Bullet: ${u.stats.bullet.rating}.` : ""}
                    </p>
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
