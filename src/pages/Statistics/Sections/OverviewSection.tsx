

export default function OverviewSection({ players }: { players: any[] }) {
    const totalPlayers = players.length;

    const ratings = {
        rapid: [],
        blitz: [],
        bullet: [],
        daily: [],
        puzzles: [],
    } as Record<string, number[]>;

    players.forEach(p => {
        const s = p.stats;
        if (!s) return;

        if (s.rapid?.rating) ratings.rapid.push(s.rapid.rating);
        if (s.blitz?.rating) ratings.blitz.push(s.blitz.rating);
        if (s.bullet?.rating) ratings.bullet.push(s.bullet.rating);
        if (s.daily?.rating) ratings.daily.push(s.daily.rating);
        if (s.puzzles?.rating) ratings.puzzles.push(s.puzzles.rating);
    });

    const avg = (arr: number[]) =>
        arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : "–";

    return (
        <div className="overview-grid">

            <div className="overview-card primary">
                <h4>Jugadors totals</h4>
                <p className="value">{totalPlayers}</p>
            </div>

            <div className="overview-card">
                <h4>Elo mitjà Rapid</h4>
                <p className="value">{avg(ratings.rapid)}</p>
            </div>

            <div className="overview-card">
                <h4>Elo mitjà Blitz</h4>
                <p className="value">{avg(ratings.blitz)}</p>
            </div>

            <div className="overview-card">
                <h4>Elo mitjà Bullet</h4>
                <p className="value">{avg(ratings.bullet)}</p>
            </div>

            <div className="overview-card">
                <h4>Elo mitjà Daily</h4>
                <p className="value">{avg(ratings.daily)}</p>
            </div>

            <div className="overview-card">
                <h4>Puzzles – Elo mitjà</h4>
                <p className="value">{avg(ratings.puzzles)}</p>
            </div>
        </div>
    );
}
