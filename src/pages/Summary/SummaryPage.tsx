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
                const usersSnap = await getDocs(collection(db, "usuaris"));
                const users = usersSnap.docs.map((d) => d.data());
                users.sort((a: any, b: any) => (a.joined || 0) - (b.joined || 0));

                const gamesSnap = await getDocs(collection(db, "games"));
                const games = gamesSnap.docs.map((d) => d.data());
                games.sort((a: any, b: any) => (b.end_time || 0) - (a.end_time || 0));

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

                setData({ users, games, stats: { totalGames, whiteWins, blackWins, draws, avgElo, sortedOpenings } });
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
        fontFamily: "Georgia, serif", // More "document" like
        fontSize: "16px",
        lineHeight: "1.6",
        boxSizing: "border-box"
    };

    const safeDate = (timestamp: any) => {
        if (!timestamp) return "an unknown date";
        try {
            const date = new Date(timestamp * 1000);
            if (isNaN(date.getTime())) return "an invalid date";
            return date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
        } catch { return "an error date"; }
    };

    if (status === "loading") return <div style={containerStyle}>Generating system knowledge base...</div>;
    if (status === "error") return <div style={containerStyle}><h1 style={{ color: "red" }}>Error</h1><p>{errorMsg}</p></div>;
    if (!data) return <div style={containerStyle}>No data found.</div>;

    return (
        <div style={containerStyle}>
            <h1>SGBD Chess System Knowledge Base</h1>
            <p><em>This document contains a comprehensive summary of the SGBD Chess system state as of {new Date().toLocaleDateString()}. It is formatted as descriptive statements to facilitate understanding.</em></p>

            <hr />

            <h2>1. System Overview</h2>
            <p>
                The SGBD Chess database currently holds records for <strong>{data.stats.totalGames} chess matches</strong>.
                Across these games, the average player rating (ELO) is approximately <strong>{data.stats.avgElo}</strong>.
            </p>
            <p>
                <strong>Match Outcomes:</strong> White has won {data.stats.whiteWins} games, Black has won {data.stats.blackWins} games, and {data.stats.draws} games have ended in a draw.
            </p>
            <p>
                <strong>Most Popular Openings:</strong> The most frequently played openings are:
                {data.stats.sortedOpenings.map(([name, count]: any, index: number) => (
                    <span key={index}> {name} ({count} games){index < data.stats.sortedOpenings.length - 1 ? "," : "."}</span>
                ))}
            </p>

            <hr />

            <h2>2. Registered Users</h2>
            <p>The following section details the profiles of all {data.users.length} registered users, ordered by their registration date.</p>

            {data.users.map((u: any, i: number) => (
                <div key={i} style={{ marginBottom: "1.5em" }}>
                    <p>
                        <strong>User #{i + 1}: {u.username}</strong>
                        {u.name ? ` (also known as ${u.name})` : ""} is a player
                        {u.location ? ` located in ${u.location}` : ""} who joined the platform on {safeDate(u.joined)}.
                        They currently have {u.followers} followers.
                    </p>
                    {u.stats && (
                        <p style={{ marginLeft: "20px" }}>
                            Performance Metrics:
                            {u.stats.rapid?.games ? ` In Rapid chess, they have played ${u.stats.rapid.games} games and have a rating of ${u.stats.rapid.rating}.` : ""}
                            {u.stats.blitz?.games ? ` In Blitz chess, they have played ${u.stats.blitz.games} games and have a rating of ${u.stats.blitz.rating}.` : ""}
                            {u.stats.bullet?.games ? ` In Bullet chess, they have played ${u.stats.bullet.games} games and have a rating of ${u.stats.bullet.rating}.` : ""}
                        </p>
                    )}
                </div>
            ))}

            <hr />

            <h2>3. Recent Match History</h2>
            <p>This section lists the details of recorded matches, starting with the most recent.</p>

            {data.games.map((g: any, i: number) => (
                <div key={i} style={{ marginBottom: "1em", borderBottom: "1px solid #eee", paddingBottom: "0.5em" }}>
                    <p>
                        On {safeDate(g.end_time)}, a <strong>{g.time_class}</strong> match was played between <strong>{g.white?.username || "Unknown"}</strong> (White, {g.white?.rating}) and <strong>{g.black?.username || "Unknown"}</strong> (Black, {g.black?.rating}).
                    </p>
                    <p>
                        The game concluded with a result of <strong>{g.white?.result === "win" ? "1-0 (White victory)" : g.black?.result === "win" ? "0-1 (Black victory)" : "1/2-1/2 (Draw)"}</strong>.
                        The opening played was the <strong>{g.opening?.name || "Unknown Opening"}</strong>.
                    </p>
                    {g.pgn && (
                        <p style={{ fontSize: "0.9em", color: "#555" }}>
                            <strong>Move Text (PGN):</strong> {g.pgn.replace(/\n/g, " ")}
                        </p>
                    )}
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
