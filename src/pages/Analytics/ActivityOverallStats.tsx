// src/pages/Analytics/ActivityOverallStats.tsx
export default function ActivityOverallStats({ logs }: { logs: any[] }) {
    const total = logs.length;

    const uniqueUsers = new Set(logs.map((l) => l.username)).size;

    const last24h = logs.filter(
        (l) => Date.now() - l.timestamp < 24 * 60 * 60 * 1000
    ).length;

    const last7d = logs.filter(
        (l) => Date.now() - l.timestamp < 7 * 24 * 60 * 60 * 1000
    ).length;

    return (
        <div className="analytics-overview">
            <div className="analytics-overview-item">
                <h4>Total visites</h4>
                <span>{total}</span>
            </div>

            <div className="analytics-overview-item">
                <h4>Usuaris únics</h4>
                <span>{uniqueUsers}</span>
            </div>

            <div className="analytics-overview-item">
                <h4>Últimes 24h</h4>
                <span>{last24h}</span>
            </div>

            <div className="analytics-overview-item">
                <h4>Últims 7 dies</h4>
                <span>{last7d}</span>
            </div>
        </div>
    );
}
