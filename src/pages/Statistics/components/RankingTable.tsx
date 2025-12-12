// src/pages/Statistics/components/RankingTable.tsx
import "./RankingTable.css";

export type RankingRow = {
    username: string;
    avatar?: string;
    rating: number;
    games?: number;
};

type RankingTableProps = {
    title: string;
    rows: RankingRow[];
    unit?: "followers" | "games" | "none";
};

export default function RankingTable({ title, rows, unit = "games" }: RankingTableProps) {
    return (
        <div className="ranking-card">
            <h4 className="ranking-title">{title}</h4>

            {rows.length === 0 && (
                <p className="ranking-empty">Encara no hi ha dades.</p>
            )}

            {rows.length > 0 && (
                <table className="ranking-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Jugador</th>
                            <th>Valor</th>
                            {unit !== "none" && <th>{unit === "followers" ? "Followers" : "Info"}</th>}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((r, idx) => (
                            <tr key={r.username}>
                                <td>{idx + 1}</td>

                                <td className="ranking-player-cell">
                                    {r.avatar && (
                                        <img
                                            src={r.avatar}
                                            alt={r.username}
                                            className="ranking-avatar"
                                        />
                                    )}
                                    <span>{r.username}</span>
                                </td>

                                <td>{r.rating}</td>

                                {unit === "followers" && <td>{r.rating}</td>}

                                {unit === "games" && (
                                    <td>{r.games != null ? `${r.games} games` : "—"}</td>
                                )}

                                {unit === "none" && <td></td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
