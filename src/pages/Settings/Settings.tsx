import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Settings.css";
import Header from "../../components/layout/Header";
import { useAuth } from "../../context/AuthContext";
import { updateUserChessUsername, getUserAccount } from "../../libs/auth";

type LinkStatus = "idle" | "verifying" | "success" | "error";

export default function Settings() {
    const { currentUser } = useAuth();
    const [chessUsername, setChessUsername] = useState("");
    const [status, setStatus] = useState<LinkStatus>("idle");
    const [message, setMessage] = useState("");
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            getUserAccount(currentUser.uid).then(account => {
                if (account?.chessUsername) {
                    setChessUsername(account.chessUsername);
                    // Opcional: carregar avatar si ja el tenim
                    fetch(`https://api.chess.com/pub/player/${account.chessUsername}`)
                        .then(res => res.json())
                        .then(data => setAvatarPreview(data.avatar || null))
                        .catch(() => { });
                }
            });
        }
    }, [currentUser]);

    const handleVerify = async () => {
        if (!chessUsername.trim()) return;
        setStatus("verifying");
        setMessage("");
        setAvatarPreview(null);

        try {
            const res = await fetch(`https://api.chess.com/pub/player/${chessUsername.toLowerCase()}`);
            if (!res.ok) {
                setStatus("error");
                setMessage("Usuari de Chess.com no trobat.");
                return;
            }
            const data = await res.json();
            setAvatarPreview(data.avatar || null);
            setStatus("idle"); // Verified but not saved yet
        } catch (err) {
            setStatus("error");
            setMessage("Error de connexió amb Chess.com");
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;
        if (!chessUsername.trim()) {
            setMessage("Escriu un nom d'usuari.");
            return;
        }

        setStatus("verifying");
        try {
            // Verify one last time before saving
            const res = await fetch(`https://api.chess.com/pub/player/${chessUsername.toLowerCase()}`);
            if (!res.ok) {
                setStatus("error");
                setMessage("Usuari no vàlid. Comprova el nom.");
                return;
            }

            await updateUserChessUsername(currentUser.uid, chessUsername);
            setStatus("success");
            setMessage("Compte vinculat correctament!");
        } catch (err) {
            console.error(err);
            setStatus("error");
            setMessage("Error al guardar a la base de dades.");
        }
    };

    return (
        <div className="page settings-page">
            <Header />
            <main className="settings-main animate-fade-in">
                <div className="settings-card">
                    <h2>Configuració del Compte</h2>
                    <p className="settings-subtitle">Vincula el teu compte de Chess.com per desbloquejar estadístiques de rivalitat.</p>

                    <div className="form-group">
                        <label>Usuari de Chess.com</label>
                        <div className="input-row">
                            <input
                                type="text"
                                value={chessUsername}
                                onChange={(e) => setChessUsername(e.target.value)}
                                placeholder="Ex: MagnusCarlsen"
                                className="settings-input"
                                onBlur={handleVerify}
                            />
                        </div>
                    </div>

                    {avatarPreview && (
                        <div className="avatar-preview animate-fade-in">
                            <img src={avatarPreview} alt="Chess.com avatar" />
                            <span>Aquest ets tu?</span>
                        </div>
                    )}

                    {message && (
                        <p className={`status-message ${status === "error" ? "error" : "success"}`}>
                            {message}
                        </p>
                    )}

                    <button
                        className="save-btn"
                        onClick={handleSave}
                        disabled={status === "verifying"}
                    >
                        {status === "verifying" ? "Guardant..." : "Guardar Canvis"}
                    </button>

                    {status === "success" && (
                        <p className="hint-text">
                            Ara pots visitar perfils d'altres jugadors i veure el marcador "Head-to-Head"!
                        </p>
                    )}

                    <div style={{ marginTop: "2rem" }}>
                        <Link to="/" className="cancel-link" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }}>
                            &larr; Tornar a l&apos;inici
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
