import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../libs/auth";
import "./Auth.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await loginUser(email, password);
            // Redirect to home/stats after successful login
            navigate("/stats");
        } catch (err: any) {
            console.error(err);
            // Firebase auth errors usually have a code, but we can just show message or map it
            if (err.code === "auth/invalid-credential") {
                setError("Credencials incorrectes. Si us plau, revisa el correu i la contrasenya.");
            } else {
                setError("Hi ha hagut un error en iniciar sessió. Torna-ho a provar.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box animate-in">
                <h2 className="auth-title">Benvingut de nou</h2>
                <p className="auth-subtitle">Inicia sessió per continuar millorant</p>

                {error && <div className="auth-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
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
                            placeholder="••••••••"
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? "Iniciant..." : "Iniciar Sessió"}
                    </button>
                </form>

                <p className="auth-link">
                    Encara no tens compte? <Link to="/register">Crea'n un gratuïtament</Link>
                </p>
            </div>
        </div>
    );
}
