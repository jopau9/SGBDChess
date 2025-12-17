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
    const { currentUser } = useAuth();
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
                            <span className="user-greeting">Hola, {currentUser.displayName || "Usuari"}</span>
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
