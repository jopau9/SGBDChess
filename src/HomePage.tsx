
import { useState, type FormEvent } from "react";
import "./HomePage.css";

type View = "openings" | "topPlayers" | "topGames" | "search";

function HomePage() {
  const [activeView, setActiveView] = useState<View>("openings");
  const [searchTerm, setSearchTerm] = useState("");
  const [lastSearch, setLastSearch] = useState<string | null>(null);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setActiveView("search");
    setLastSearch(searchTerm.trim());
  }

  return (
    <div className="page">
      <div className="homepage">
        {/* CAPÇALERA */}
        <header className="homepage-header">
          <div className="header-left">
            <div className="logo-circle">logo</div>
            <span className="brand">ChessStats</span>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Busca un jugador"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">cerca</button>
          </form>
        </header>

        {/* SUB-NAV */}
        <nav className="subnav">
          <button
            className={activeView === "openings" ? "tab active" : "tab"}
            onClick={() => setActiveView("openings")}
          >
            Millors<br />openings
          </button>
          <button
            className={activeView === "topPlayers" ? "tab active" : "tab"}
            onClick={() => setActiveView("topPlayers")}
          >
            Top jugadors
          </button>
          <button
            className={activeView === "topGames" ? "tab active" : "tab"}
            onClick={() => setActiveView("topGames")}
          >
            Top partides
          </button>
        </nav>

        {/* CONTINGUT VARIABLE */}
        <main className="homepage-main">
          {activeView === "openings" && <OpeningsView />}
          {activeView === "topPlayers" && <TopPlayersView />}
          {activeView === "topGames" && <TopGamesView />}
          {activeView === "search" && (
            <SearchResultsView searchTerm={lastSearch ?? ""} />
          )}
        </main>
      </div>
    </div>
  );
}

/* PLACEHOLDERS per la zona blanca */

function OpeningsView() {
  return (
    <section>
      <h2>Millors openings</h2>
      <p>
        Aquí mostrarem estadístiques d&apos;openings (percentatge de victòries,
        rànquings, etc.).
      </p>
    </section>
  );
}

function TopPlayersView() {
  return (
    <section>
      <h2>Top jugadors</h2>
      <p>Aquí mostrarem jugadors destacats i els seus rànquings.</p>
    </section>
  );
}

function TopGamesView() {
  return (
    <section>
      <h2>Top partides</h2>
      <p>
        Aquí mostrarem partides espectaculars, llargues o amb sacrificis
        interessants.
      </p>
    </section>
  );
}

type SearchResultsProps = {
  searchTerm: string;
};

function SearchResultsView({ searchTerm }: SearchResultsProps) {
  return (
    <section>
      <h2>Resultats de la cerca</h2>
      <p>
        Has cercat: <strong>{searchTerm}</strong>
      </p>
      <p>
        🔜 Aquí connectarem amb la API de Chess.com per mostrar estadístiques del
        jugador, gràfiques, openings més jugades, etc.
      </p>
    </section>
  );
}

export default HomePage;
