import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../libs/auth";
import "./Auth.css";

export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (password.length < 6) {
            setError("La contrasenya ha de tenir almenys 6 caràcters.");
            setLoading(false);
            return;
        }

        try {
            await registerUser(email, password, username);
            // Redirect to home/stats after successful registration
            navigate("/stats");
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
                setError("Aquest correu electrònic ja està registrat.");
            } else {
                // Show the actual error message for debugging
                setError(`Error: ${err.message || "Hi ha hagut un error inesperat."}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box animate-in">
                <h2 className="auth-title">Uneix-te a ChessStats</h2>
                <p className="auth-subtitle">Crea el teu compte per seguir el teu progrés</p>

                {error && <div className="auth-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="username">Nom d'usuari</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Ex: GranMestre123"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Correu electrònic</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="nom@exemple.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Contrasenya</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Mínim 6 caràcters"
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? "Creant compte..." : "Començar Ara"}
                    </button>
                </form>

                <p className="auth-link">
                    Ja tens compte? <Link to="/login">Inicia sessió aquí</Link>
                </p>
            </div>
        </div>
    );
}
