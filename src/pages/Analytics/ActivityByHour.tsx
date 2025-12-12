// src/pages/Analytics/ActivityByHour.tsx
export default function ActivityByHour({ logs }: { logs: any[] }) {
    const hours: Record<number, number> = {};

    logs.forEach((l) => {
        const h = new Date(l.timestamp).getHours();
        hours[h] = (hours[h] || 0) + 1;
    });

    const list = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        count: hours[h] || 0,
    }));

    return (
        <div className="analytics-card">
            <h3>Visites per hora</h3>
            <p className="analytics-sub">Quan es connecten més els jugadors?</p>

            <table className="analytics-table">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Visites</th>
                    </tr>
                </thead>
                <tbody>
                    {list.map((row) => (
                        <tr key={row.hour}>
                            <td>{row.hour}:00</td>
                            <td>{row.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
