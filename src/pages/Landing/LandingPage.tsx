import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "./LandingPage.css";
import Header from "../../components/layout/Header";

export default function LandingPage() {
    return (
        <div className="landing-page">
            <Header className="landing-header" />
            <div className="landing-content">
                <img src={logo} alt="ChessStats Logo" className="landing-logo" />
                <h1 className="landing-title">ChessStats</h1>
                <p className="landing-subtitle">
                    Analitza les teves partides, descobreix els teus punts forts i millora el teu joc amb estadístiques avançades.
                </p>

                <Link to="/stats" className="cta-button">
                    Veure Estadístiques →
                </Link>

                <div className="features-grid">
                    <div className="feature-item">
                        <span className="feature-icon">📊</span>
                        <span className="feature-title">Anàlisi Detallat</span>
                        <span className="feature-desc">Desglossa el teu rendiment per obertures i colors.</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🏆</span>
                        <span className="feature-title">Top Partides</span>
                        <span className="feature-desc">Reviu les teves millors victòries i moments èpics.</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">⚡</span>
                        <span className="feature-title">Ràpid i Fluid</span>
                        <span className="feature-desc">Interfície moderna optimitzada per a la millor experiència.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
