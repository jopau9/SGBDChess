import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./Header.css";

type HeaderProps = {
    children?: React.ReactNode;
    className?: string;
};

export default function Header({ children, className = "" }: HeaderProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/stats?q=${encodeURIComponent(searchTerm)}`);
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

            <form className="search-bar" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Busca un jugador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit">🔍</button>
            </form>

            {children}
        </header>
    );
}
