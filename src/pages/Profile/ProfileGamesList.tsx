import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../../libs/firebase";
import { Link } from "react-router-dom";
import "./ProfileGamesList.css";

interface ProfileGamesListProps {
    username: string;
}

export default function ProfileGamesList({ username }: ProfileGamesListProps) {
    const [games, setGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<"date" | "moves" | "opponent">("date");

    useEffect(() => {
        async function fetchGames() {
            setLoading(true);
            try {
                const gamesRef = collection(db, "games");

                // Intentem fer la query ordenada per timestamp (requereix índex compost)
                try {
                    const q = query(
                        gamesRef,
                        where("username", "==", username),
                        orderBy("timestamp", "desc"),
                        limit(50)
                    );
                    const snap = await getDocs(q);
                    const fetchedGames = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                    setGames(fetchedGames);
                } catch (indexError: any) {
                    console.warn("Index missing or query failed, falling back to client-side sort:", indexError);

                    // Fallback: Si falla l'índex, agafem més partides (ex: 200) sense ordenar i ordenem a client
                    // Això assegura que almenys es vegin algunes partides recents si estan dins les 200 retornades
                    // Nota: Firestore sense ordre retorna per ID, que sovint és cronològic, així que agafar les últimes 200 IDs pot funcionar.
                    // Però com que els IDs poden ser strings arbitraris, no és garantit.
                    // Millor opció sense índex: agafar-ne moltes.
                    const qFallback = query(
                        gamesRef,
                        where("username", "==", username),
                        limit(300)
                    );
                    const snap = await getDocs(qFallback);
                    const fetchedGames = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

                    // Ordenem manualment
                    fetchedGames.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

                    // Ens quedem amb les 50 primeres
                    setGames(fetchedGames.slice(0, 50));
                }

            } catch (err) {
                console.error("Error fetching games:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchGames();
    }, [username]);

    const sortedGames = [...games].sort((a, b) => {
        if (sortOrder === "date") {
            return (b.timestamp || 0) - (a.timestamp || 0);
        }
        if (sortOrder === "moves") {
            return (b.move_count || 0) - (a.move_count || 0);
        }
        if (sortOrder === "opponent") {
            return (b.opponent_rating || 0) - (a.opponent_rating || 0);
        }
        return 0;
    });

    const getResultClass = (result: string) => {
        const res = result?.toLowerCase();
        if (res === "win") return "result-win";
        if (
            res === "agreed" ||
            res === "repetition" ||
            res === "stalemate" ||
            res === "insufficient" ||
            res === "50move" ||
            res === "timevsinsufficient"
        ) {
            return "result-draw";
        }
        return "result-loss";
    };

    if (loading) return <p>Carregant partides...</p>;

    return (
        <div className="profile-games-list">
            <div className="games-filters">
                <button
                    className={sortOrder === "date" ? "active" : ""}
                    onClick={() => setSortOrder("date")}
                >
                    Més recents
                </button>
                <button
                    className={sortOrder === "moves" ? "active" : ""}
                    onClick={() => setSortOrder("moves")}
                >
                    Més llargues
                </button>
                <button
                    className={sortOrder === "opponent" ? "active" : ""}
                    onClick={() => setSortOrder("opponent")}
                >
                    Millor rival
                </button>
            </div>

            <div className="games-grid">
                {sortedGames.map((g) => (
                    <Link key={g.id} to={`/game/${g.id}`} className="game-item-link">
                        <div className={`game-item-card ${getResultClass(g.result)}`}>
                            <div className="game-item-header">
                                <span className="game-item-opponent">
                                    vs {g.opponent_username || "Unknown"} ({g.opponent_rating})
                                </span>
                                <span className="game-item-result-badge">
                                    {g.result}
                                </span>
                            </div>
                            <div className="game-item-meta">
                                <span>{g.time_class}</span>
                                <span>{g.move_count} movs</span>
                                <span>{new Date(g.timestamp * 1000).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
