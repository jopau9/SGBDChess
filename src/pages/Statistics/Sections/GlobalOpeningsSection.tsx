// src/pages/Statistics/Sections/GlobalOpeningsSection.tsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../libs/firebase.ts";

import OpeningsTable from "../components/OpeningsTable";
import OpeningsChart from "../components/OpeningsChart";

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

export default function GlobalOpeningsSection() {
    const [openings, setOpenings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);

            // 🔹 Aquí és on va el codi de Firestore:
            const snap = await getDocs(collection(db, "games"));
            const allGames = snap.docs.map((d) => d.data() as GameDoc);

            const openingStats: Record<string, any> = {};

            for (const g of allGames) {
                const opening = g.opening || "Opening not detected";

                if (!g.opening || g.opening === "Unknown Opening") continue;

                if (!openingStats[opening]) {
                    openingStats[opening] = {
                        name: opening,
                        games: 0,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                    };
                }

                openingStats[opening].games++;

                const result = g.result || "unknown";

                if (result === "win") {
                    openingStats[opening].wins++;
                } else if (
                    ["checkmated", "resigned", "timeout", "lose"].includes(result)
                ) {
                    openingStats[opening].losses++;
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
                    openingStats[opening].draws++;
                } else {
                    // la resta les podem deixar com draws o ignorar
                    openingStats[opening].draws++;
                }
            }

            const list = Object.values(openingStats)
                .map((o: any) => ({
                    ...o,
                    winrate: o.games ? ((o.wins / o.games) * 100).toFixed(1) : "0",
                }))
                .sort((a: any, b: any) => b.games - a.games);

            setOpenings(list);
            setLoading(false);
        }

        load();
    }, []);

    if (loading) return <p>Carregant obertures globals…</p>;

    return (
        <div>
            <OpeningsChart openings={openings.slice(0, 10)} />
            <OpeningsTable openings={openings} />
        </div>
    );
}
