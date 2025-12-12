// src/pages/Statistics/WebActivityAnalytics.tsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../libs/firebase";

import "./WebActivityAnalytics.css";

import ActivityTopUsers from "./ActivityTopUsers";
import ActivityByDay from "./ActivityByDay";
import ActivityRecentLogs from "./ActivityRecentLogs";

export default function WebActivityAnalytics() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const snap = await getDocs(collection(db, "web_activity"));
            const items = snap.docs.map((d) => d.data());

            // ordenar logs per timestamp (descendent)
            items.sort((a, b) => b.timestamp - a.timestamp);

            setLogs(items);
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <p>Carregant activitat…</p>;

    // --- Overview analytics ---
    const totalVisits = logs.length;
    const uniqueUsers = new Set(logs.map((l) => l.username)).size;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const visitsThisWeek = logs.filter((l) => l.timestamp >= weekAgo).length;

    const firstDate = logs.at(-1)?.timestamp ?? Date.now();
    const daysActive =
        Math.max(1, Math.round((Date.now() - firstDate) / (24 * 3600 * 1000)));

    const avgPerDay = (totalVisits / daysActive).toFixed(1);

    return (
        <div className="analytics-page">

            <h2>Web Activity Analytics</h2>
            <p className="analytics-page-sub">
                Activitat real dels usuaris dins la plataforma ChessStats.
            </p>

            {/* ============================
                OVERVIEW
            ============================= */}
            <div className="analytics-overview">
                <div className="analytics-overview-item">
                    <h4>Total visits</h4>
                    <span>{totalVisits}</span>
                </div>

                <div className="analytics-overview-item">
                    <h4>Unique users</h4>
                    <span>{uniqueUsers}</span>
                </div>

                <div className="analytics-overview-item">
                    <h4>Visits this week</h4>
                    <span>{visitsThisWeek}</span>
                </div>

                <div className="analytics-overview-item">
                    <h4>Avg visits/day</h4>
                    <span>{avgPerDay}</span>
                </div>
            </div>

            {/* ============================
                TOP USERS
            ============================= */}
            <div className="analytics-card">
                <h3>Most active users</h3>
                <p className="analytics-sub">
                    Jugadors amb més activitat registrada.
                </p>

                <ActivityTopUsers logs={logs} />
            </div>

            {/* ============================
                VISITES PER DIA
            ============================= */}
            <div className="analytics-card">
                <h3>Daily activity distribution</h3>
                <p className="analytics-sub">
                    Com es reparteixen les visites segons el dia.
                </p>

                <ActivityByDay logs={logs} />
            </div>

            {/* ============================
                RECENT LOGS
            ============================= */}
            <div className="analytics-card">
                <h3>Recent activity</h3>
                <p className="analytics-sub">
                    Últimes interaccions registrades a la plataforma.
                </p>

                <ActivityRecentLogs logs={logs} />
            </div>
        </div>
    );
}
