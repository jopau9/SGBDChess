import RankingTable from "../components/RankingTable";

export default function RankingsSection({ players }: { players: any[] }) {
    function top(mode: string, limit = 10) {
        const list = [];

        for (const p of players) {
            const s = p.stats;
            if (!s) continue;

            const cat = mode === "puzzles" ? s.puzzles : s[mode];
            if (!cat?.rating) continue;

            list.push({
                username: p.username,
                avatar: p.avatar,
                rating: cat.rating,
                games: cat.games ?? cat.total ?? 0,
            });
        }

        return list.sort((a, b) => b.rating - a.rating).slice(0, limit);
    }

    return (
        <div className="ranking-grid">

            <RankingTable title="Top Rapid" rows={top("rapid")} />
            <RankingTable title="Top Blitz" rows={top("blitz")} />
            <RankingTable title="Top Bullet" rows={top("bullet")} />
            <RankingTable title="Top Daily" rows={top("daily")} />
            <RankingTable title="Top Puzzles" rows={top("puzzles")} />

        </div>
    );
}
