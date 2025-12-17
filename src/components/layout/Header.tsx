import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./Header.css";

type HeaderProps = {
    children?: React.ReactNode;
    className?: string;
};

import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../libs/auth";

export default function Header({ children, className = "" }: HeaderProps) {
    const { currentUser, userProfile } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/stats?q=${encodeURIComponent(searchTerm)}`);
        }
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate("/");
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <header className={`homepage-header ${className}`}>
            <div className="header-left">
                <Link to="/" className="logo-link">
                    <div className="logo-circle">
                        <img src={logo} alt="logo" className="logo-img" />
                    </div>
                    <span className="brand">ChessStats</span>
                </Link>
            </div>

            <div className="header-right-group">
                <form className="search-bar" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Busca un jugador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit">🔍</button>
                </form>

                <div className="auth-controls">
                    {currentUser ? (
                        <div className="user-menu">
                            <button onClick={() => {
                                if (userProfile?.chessUsername) {
                                    navigate(`/profile/${userProfile.chessUsername}`);
                                } else {
                                    navigate("/settings");
                                    // Maybe flash a message via URL params or simple alert for now
                                    // Ideally, we'd use a toast context, but alert is robust for a quick fix.
                                    // Actually, let's just navigate. User seeing settings with "Link Account" is self-explanatory.
                                    alert("Has de vincular el teu compte de Chess.com primer!");
                                }
                            }} className="user-profile-btn">
                                {/* Simple user icon SVG */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0M3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1 .437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1 .437-.695Z" clipRule="evenodd" />
                                </svg>
                                <span>{currentUser.displayName || userProfile?.username || "Usuari"}</span>
                            </button>
                            <Link to="/settings" className="nav-link" style={{ color: "#cbd5e1", textDecoration: "none", fontSize: "0.95rem", fontWeight: 500, marginRight: "1rem" }}>
                                Configuració
                            </Link>
                            <button onClick={handleLogout} className="logout-btn">Sortir</button>
                        </div>
                    ) : (
                        <div className="auth-links">
                            <Link to="/login" className="login-link">Iniciar Sessió</Link>
                            <Link to="/register" className="register-btn">Registrar-se</Link>
                        </div>
                    )}
                </div>
            </div>

            {children}
        </header>
    );
}
