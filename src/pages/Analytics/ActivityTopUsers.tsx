// src/pages/Analytics/ActivityTopUsers.tsx
export default function ActivityTopUsers({ logs }: { logs: any[] }) {

    // Agrupar per username
    const counter: Record<string, number> = {};

    logs.forEach((log) => {
        counter[log.username] = (counter[log.username] || 0) + 1;
    });

    // Ordenar
    const top = Object.entries(counter)
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return (
        <div className="analytics-card">
            <h3>Jugadors més actius</h3>
            <p className="analytics-sub">Basat en visites totals</p>

            <table className="analytics-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Usuari</th>
                        <th>Visites</th>
                    </tr>
                </thead>
                <tbody>
                    {top.map((u, i) => (
                        <tr key={u.username}>
                            <td>{i + 1}</td>
                            <td>{u.username}</td>
                            <td>{u.count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
