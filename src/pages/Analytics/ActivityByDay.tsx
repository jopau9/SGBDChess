// src/pages/Analytics/ActivityByDay.tsx
import { format } from "date-fns";

export default function ActivityByDay({ logs }: { logs: any[] }) {
    const days: Record<string, number> = {};

    logs.forEach((l) => {
        const date = format(new Date(l.timestamp), "yyyy-MM-dd");
        days[date] = (days[date] || 0) + 1;
    });

    const sorted = Object.entries(days).sort((a, b) =>
        a[0].localeCompare(b[0])
    );

    return (
        <div className="analytics-card">
            <h3>Visites per dia</h3>
            <p className="analytics-sub">Evolució temporal d'activitat</p>

            <table className="analytics-table">
                <thead>
                    <tr>
                        <th>Dia</th>
                        <th>Visites</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(([day, count]) => (
                        <tr key={day}>
                            <td>{day}</td>
                            <td>{count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
