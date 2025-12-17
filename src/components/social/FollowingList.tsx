
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getFollowedPlayers, type FollowedPlayer } from "../../libs/social";
import "./FollowingList.css";

export default function FollowingList() {
    const { currentUser } = useAuth();
    const [following, setFollowing] = useState<FollowedPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadFollowing() {
            if (!currentUser) {
                setFollowing([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const list = await getFollowedPlayers(currentUser.uid);
                setFollowing(list);
            } catch (err) {
                console.error("Error loading followed players:", err);
            } finally {
                setLoading(false);
            }
        }

        loadFollowing();
    }, [currentUser]);

    if (!currentUser) return null;

    if (loading) {
        return (
            <div className="following-list-container">
                <h3>Jugadors Seguits</h3>
                <p className="loading-text">Carregant...</p>
            </div>
        );
    }

    if (following.length === 0) {
        return (
            <div className="following-list-container">
                <h3>Jugadors Seguits</h3>
                <p className="empty-text">Encara no segueixes a ningú.</p>
            </div>
        );
    }

    return (
        <div className="following-list-container">
            <h3>Jugadors Seguits</h3>
            <ul className="following-list">
                {following.map((p) => (
                    <li key={p.username}>
                        <Link to={`/profile/${p.username}`} className="following-item">
                            <div className="following-avatar">
                                {p.avatar ? (
                                    <img src={p.avatar} alt={p.username} />
                                ) : (
                                    <div className="avatar-placeholder">{p.username[0].toUpperCase()}</div>
                                )}
                            </div>
                            <span className="following-username">{p.username}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
