
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { checkIsFollowing, followPlayer, unfollowPlayer } from "../../libs/social";
import "./FollowButton.css";

type FollowButtonProps = {
    targetUsername: string;
    targetAvatar?: string;
    className?: string;
};

export default function FollowButton({
    targetUsername,
    targetAvatar,
    className = "",
}: FollowButtonProps) {
    const { currentUser } = useAuth();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hover, setHover] = useState(false);

    useEffect(() => {
        if (!currentUser || !targetUsername) return;

        let cancel = false;
        async function check() {
            if (!currentUser) return;
            try {
                const following = await checkIsFollowing(currentUser.uid, targetUsername);
                if (!cancel) setIsFollowing(following);
            } catch (error) {
                console.error("Error checking follow status:", error);
            }
        }
        check();
        return () => {
            cancel = true;
        };
    }, [currentUser, targetUsername]);

    const handleToggleFollow = async () => {
        if (!currentUser) {
            alert("Has d'iniciar sessió per seguir jugadors!");
            return;
        }

        if (currentUser.displayName === targetUsername) {
            // Prevent following self slightly cleaner if button isn't hidden
            return;
        }

        setLoading(true);
        try {
            if (isFollowing) {
                await unfollowPlayer(currentUser.uid, targetUsername);
                setIsFollowing(false);
            } else {
                await followPlayer(currentUser.uid, targetUsername, targetAvatar);
                setIsFollowing(true);
            }
        } catch (err) {
            console.error(err);
            alert("Error en actualitzar el seguiment.");
        } finally {
            setLoading(false);
        }
    };

    if (currentUser?.displayName === targetUsername) return null; // Don't show button for own profile

    return (
        <button
            className={`follow-btn ${isFollowing ? "following" : "not-following"} ${className}`}
            onClick={handleToggleFollow}
            disabled={loading}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {loading ? (
                <span className="spinner">⌛</span>
            ) : isFollowing ? (
                hover ? "Deixar de seguir" : "Seguint"
            ) : (
                "Seguir"
            )}
        </button>
    );
}
