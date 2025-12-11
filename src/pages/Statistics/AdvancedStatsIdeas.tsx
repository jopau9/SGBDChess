// src/pages/Profile/AdvancedStatsIdeas.tsx
// ✨ IDEES D'ESTADÍSTIQUES AVANÇADES (ENCARA NO S'USA A LA UI)
//
// Aquest fitxer NO s'importa enlloc de moment. És només un "laboratori d'idees"
// per pensar com volem estructurar les estadístiques, quines mètriques tindrem,
// i quins gràfics en podem treure (sense implementar-ho de debò).

import { useEffect, useState } from "react";
import type { Player } from "../Home/HomePage";

// ===============================
// 1. Tipus de dades derivades
// ===============================

// Partida crua tal com ve de Chess.com (simplificat / a adaptar)
export type RawChessGame = {
    url: string;
    pgn: string;
    end_time: number; // unix
    time_control: string; // ex: "600" o "300+3"
    time_class: "rapid" | "blitz" | "bullet" | "daily" | string;
    rules: "chess" | "chess960" | string;
    white: {
        username: string;
        rating: number;
        result: string; // "win", "checkmated", "resigned", "timeout", "agreed", etc.
    };
    black: {
        username: string;
        rating: number;
        result: string;
    };
    opening?: {
        eco: string;
        name: string;
    };
};

// Resultat normalitzat des del punt de vista del nostre jugador
export type NormalizedGame = {
    // info temporal
    date: Date;
    // info de context
    isWhite: boolean;
    timeClass: string;
    timeControl: string;
    openingName: string;
    openingEco: string;
    // info Elo
    playerRating: number;
    opponentRating: number;
    ratingDiff: number; // opponent - player
    // resultat: 1 = win, 0.5 = draw, 0 = loss
    resultNumeric: 1 | 0.5 | 0;
    resultLabel: "win" | "draw" | "loss";
};

// Paquet d'estadístiques avançades que volem construir
export type AdvancedStats = {
    // 1) Volum i ritme de joc
    gamesPerDay: Array<{ date: string; games: number }>;
    gamesPerTimeClass: Array<{ timeClass: string; games: number }>;
    gamesPerColor: { white: number; black: number };

    // 2) Rendiment bàsic
    globalWinrate: number;
    winrateByTimeClass: Array<{
        timeClass: string;
        games: number;
        winrate: number;
    }>;
    winrateByColor: {
        white: { games: number; winrate: number };
        black: { games: number; winrate: number };
    };

    // 3) Obertures (ja fas una mica això, però aquí més estructurat)
    openingsTop: Array<{
        name: string;
        games: number;
        winrate: number;
        wins: number;
        losses: number;
        draws: number;
    }>;

    // 4) Rendiment segons diferència d'Elo rival
    //    (per veure si el jugador rendeix millor contra rivals forts/débils)
    performanceByRatingGap: Array<{
        bucket: string; // ex: "-400", "-200", "even", "+200", "+400"
        games: number;
        winrate: number;
    }>;

    // 5) Tendència d'Elo (timeline de partides)
    ratingTimeline: Array<{
        date: string;
        rating: number;
    }>;

    // 6) Streaks
    longestWinStreak: number;
    longestLoseStreak: number;
    longestUnbeatenStreak: number; // win + draw

    // 7) Horari i hàbits de joc (heatmap horari)
    gamesByDayOfWeek: Array<{ day: number; games: number }>; // 0 = diumenge
    gamesByHourOfDay: Array<{ hour: number; games: number }>; // 0..23

    // 8) Longitud mitjana de les partides (a partir de la PGN)
    averageGameLengthMoves: number;
    averageGameLengthMovesInWins: number;
    averageGameLengthMovesInLosses: number;

    // (Opcional) 9) "Forma recent": winrate últimes 10-20 partides vs històric
    recentWinrate: number;
    recentGames: number;
};

// ============================================
// 2. Normalitzar les partides per jugador
// ============================================

// IDEA: partir d'un array de `RawChessGame` i del `username`,
// i convertir-ho en `NormalizedGame[]` on tot està vist des del
// punt de vista del jugador (resultat, elo, color, etc.).
export function normalizeGamesForPlayer(
    games: RawChessGame[],
    username: string
): NormalizedGame[] {
    // 💡 Aquí la implementació real faria:
    //
    // - Recórrer totes les partides.
    // - Comprovar si el jugador és blanc o negre.
    // - Determinar el resultat des del seu punt de vista:
    //     "win" -> 1
    //     ("checkmated", "resigned", "timeout", etc.) -> 0
    //     ("agreed", "repetition", "stalemate", "insufficient", etc.) -> 0.5
    // - Extreure:
    //     * data: new Date(game.end_time * 1000)
    //     * rating del jugador i del rival
    //     * diferència d’elo: rival - jugador
    //     * openingName, openingEco
    //     * timeClass, timeControl
    //
    // Retornar un array de NormalizedGame.
    return [];
}

// =======================================
// 3. Construir les estadístiques "grosses"
// =======================================

export function buildAdvancedStats(
    normalizedGames: NormalizedGame[]
): AdvancedStats {
    // 💡 Aquí només descrivim QUÈ faríem, no el codi concret.

    // 3.1 Volum i ritme de joc
    //   - gamesPerDay: agrupar per data YYYY-MM-DD i comptar partides.
    //   - gamesPerTimeClass: agrupar per timeClass (rapid/blitz/bullet/daily...)
    //   - gamesPerColor: comptar isWhite = true/false.

    // 3.2 Rendiment bàsic
    //   - globalWinrate: sum(resultNumeric) / n * 100.
    //   - winrateByTimeClass: per cada timeClass:
    //       * winrate = sum(resultNumeric) / games * 100.
    //   - winrateByColor:
    //       * white: only isWhite = true
    //       * black: only isWhite = false

    // 3.3 Obertures
    //   - Agrupar per openingName.
    //   - Per cada obertura:
    //       * comptar games, wins, losses, draws.
    //       * winrate = wins / games * 100.
    //   - Ordenar per nº de partides i/o per winrate.
    //   - Potser limitar a top 10.

    // 3.4 Rendiment segons diferència d'Elo
    //   - ratingDiff = opponentRating - playerRating.
    //   - Fer buckets tipus:
    //       * <= -400 (rival molt més fluix)
    //       * -399..-200
    //       * -199..+199 (similar)
    //       * +200..+399
    //       * >= +400 (rival molt més fort)
    //   - Per cada bucket:
    //       * games
    //       * winrate

    // 3.5 Tendència d'Elo (ratingTimeline)
    //   - Ordenar les partides per data.
    //   - Per cada partida, agafar playerRating i fer un array:
    //       [{ date: "YYYY-MM-DD", rating: ... }, ...]
    //   - Això servirà per un gràfic de línia Elo vs temps.

    // 3.6 Streaks
    //   - Recorregut seqüencial de resultats:
    //       * Convertir a seqüència "W", "D", "L".
    //       * Recorre i calcular:
    //           longestWinStreak: màx de W consecutives.
    //           longestLoseStreak: màx de L consecutives.
    //           longestUnbeatenStreak: seqüències sense L (W o D).
    //   - Això dona info de “ratxas calentes” i “ratxas dolentes”.

    // 3.7 Hàbits de joc (dia/hora)
    //   - gamesByDayOfWeek:
    //       * day = date.getDay()
    //       * comptar partides per cada 0..6
    //   - gamesByHourOfDay:
    //       * hour = date.getHours()
    //       * comptar partides per cada 0..23
    //   - Serveix per fer:
    //       * Bar chart de "dies de la setmana on més juga".
    //       * Histogram d'hores actives.

    // 3.8 Longitud de les partides
    //   - Fer un parser senzill de PGN o regexp per comptar "n." (número de jugades).
    //   - averageGameLengthMoves:
    //       * mitjana de nº de jugades (total).
    //   - averageGameLengthMovesInWins / InLosses:
    //       * mateixa idea però filtrant per resultLabel.

    // 3.9 Forma recent
    //   - recentGames = min(20, total).
    //   - recentWinrate = winrate dels últims recentGames.
    //   - Comparar amb globalWinrate (ja calculat) per veure si està millor o pitjor.

    // 🔚 Al final, retornem un objecte amb tots els arrays i valors calculats.
    return {
        gamesPerDay: [],
        gamesPerTimeClass: [],
        gamesPerColor: { white: 0, black: 0 },
        globalWinrate: 0,
        winrateByTimeClass: [],
        winrateByColor: {
            white: { games: 0, winrate: 0 },
            black: { games: 0, winrate: 0 },
        },
        openingsTop: [],
        performanceByRatingGap: [],
        ratingTimeline: [],
        longestWinStreak: 0,
        longestLoseStreak: 0,
        longestUnbeatenStreak: 0,
        gamesByDayOfWeek: [],
        gamesByHourOfDay: [],
        averageGameLengthMoves: 0,
        averageGameLengthMovesInWins: 0,
        averageGameLengthMovesInLosses: 0,
        recentWinrate: 0,
        recentGames: 0,
    };
}

// =========================================
// 4. IDEA DE VISTA D'ESTADÍSTIQUES AVANÇADES
// =========================================

type AdvancedStatsViewProps = {
    username: string;
    player: Player;
    // Idealment rebre també `games` ja carregades
    // però aquí només pensem l'estructura.
};

export function AdvancedStatsViewIdeas({
    username,
    player,
}: AdvancedStatsViewProps) {
    const [games, setGames] = useState<RawChessGame[]>([]);
    const [stats, setStats] = useState<AdvancedStats | null>(null);

    useEffect(() => {
        // 💡 Estratègia de càrrega de dades:
        //
        // 1) Mirar primer a Firestore si tenim guardat:
        //    - col·lecció `games/{username}/raw` amb les partides crues
        //    - document `analytics/{username}` amb stats precalculades
        //
        // 2) Si hi ha analytics precalculades:
        //    - les llegim i les mostrem directament (més ràpid)
        //
        // 3) Si no hi són:
        //    - anem a buscar les partides a Chess.com (no només 3 mesos,
        //      potser fins a N mesos enrere o fins que trobem un any sense activitat)
        //    - les guardem a Firestore (per no haver de repetir la descàrrega)
        //    - passem per normalizeGamesForPlayer -> buildAdvancedStats
        //    - guardem el resultat a Firestore a `analytics/{username}`
        //    - mostrem stats.
    }, [username]);

    // 💡 A nivell de UI, aquí hi posaríem gràfics:
    //
    //  - Gràfic de línia: `ratingTimeline` (Elo vs temps)
    //  - Bar chart: `winrateByTimeClass`
    //  - Bar chart apilat: win/draw/loss per top 5 obertures
    //  - Heatmap o doble bar chart:
    //       * `gamesByDayOfWeek` i `gamesByHourOfDay`
    //  - Bar chart de `performanceByRatingGap` (veure si es rendeix bé vs +200, +400…)
    //  - Targetes grans (cards) amb:
    //       * globalWinrate
    //       * recentWinrate
    //       * longestWinStreak / longestLoseStreak

    return (
        <section>
            <h3>Advanced Stats (IDEES)</h3>
            <p>
                Aquesta vista és només conceptual. Aquí hi acabarem mostrant gràfics i
                mètriques avançades calculades a partir de totes les partides de{" "}
                <strong>{username}</strong>.
            </p>

            {/* 
        Exemples d'idees de gràfics (UI):

        1) <LineChart data={stats?.ratingTimeline}>   // Evolució Elo
        2) <BarChart data={stats?.winrateByTimeClass}> // Winrate per modalitat
        3) <BarChart data={stats?.openingsTop.slice(0,5)}> // Top 5 obertures
        4) <Heatmap dataDay={stats?.gamesByDayOfWeek} dataHour={stats?.gamesByHourOfDay}>
        5) <BarChart data={stats?.performanceByRatingGap}> // Rendiment vs Elo rival

        De moment no implementem res: únicament definim què voldríem dibuixar.
      */}

            {/* També podríem mostrar algunes targetes resum: */}
            {/* 
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Global Winrate</div>
          <div className="stat-card-value">{stats?.globalWinrate ?? "–"}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Recent Winrate (últimes 20)</div>
          <div className="stat-card-value">{stats?.recentWinrate ?? "–"}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Longest Win Streak</div>
          <div className="stat-card-value">{stats?.longestWinStreak ?? "–"}</div>
        </div>
      </div>
      */}
        </section>
    );
}
