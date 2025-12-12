export default function LocationsSection({ players }: { players: any[] }) {
    const counter: Record<string, number> = {};

    players.forEach(p => {
        const loc = p.location || "Sense localització";
        counter[loc] = (counter[loc] || 0) + 1;
    });

    const list = Object.entries(counter)
        .map(([loc, count]) => ({ loc, count }))
        .sort((a, b) => b.count - a.count);

    return (
        <div className="locations-list">
            {list.map((item) => (
                <div key={item.loc} className="location-row">
                    <span>{item.loc}</span>
                    <strong>{item.count}</strong>
                </div>
            ))}
        </div>
    );
}
