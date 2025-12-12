// src/pages/Statistics/components/OpeningsTable.tsx
import { useState } from "react";
import "./OpeningsTable.css";

type OpeningRow = {
    name: string;
    games: number;
    winrate: string;
    wins: number;
    losses: number;
    draws: number;
};

export default function OpeningsTable({ openings }: { openings: OpeningRow[] }) {
    const [visibleCount, setVisibleCount] = useState(20);

    const visibleOpenings = openings.slice(0, visibleCount);
    const canShowMore = visibleCount < openings.length;

    const handleShowMore = () => {
        setVisibleCount((prev) => prev + 20); // +20 cada cop, ajusta-ho si vols
    };

    return (
        <div className="openings-card">
            <h4 className="openings-title">Obertures més jugades</h4>

            <table className="openings-table">
                <thead>
                    <tr>
                        <th>Opening</th>
                        <th>Games</th>
                        <th>WR%</th>
                        <th>W</th>
                        <th>L</th>
                        <th>D</th>
                    </tr>
                </thead>

                <tbody>
                    {visibleOpenings.map((o) => (
                        <tr key={o.name}>
                            <td>{o.name}</td>
                            <td>{o.games}</td>
                            <td>{o.winrate}%</td>
                            <td>{o.wins}</td>
                            <td>{o.losses}</td>
                            <td>{o.draws}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {canShowMore && (
                <div className="openings-more-wrapper">
                    <button
                        type="button"
                        className="openings-more-btn"
                        onClick={handleShowMore}
                    >
                        Mostrar més
                    </button>
                </div>
            )}
        </div>
    );
}
