export default function ActivityRecentLogs({ logs }: { logs: any[] }) {
    return (
        <div className="analytics-recent">
            <table className="analytics-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Event</th>
                        <th>Page</th>
                        <th>Time</th>
                    </tr>
                </thead>

                <tbody>
                    {logs.slice(0, 30).map((l, i) => (
                        <tr key={i}>
                            <td>{l.username}</td>
                            <td>{l.event}</td>
                            <td>{l.page}</td>
                            <td>{new Date(l.timestamp).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
