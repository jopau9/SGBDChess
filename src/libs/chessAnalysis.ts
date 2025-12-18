
import { Chess, Move } from "chess.js";

// Types for analysis result
export interface AnalysisResult {
    opening: string;
    accuracy: {
        white: number;
        black: number;
    };
    analysis: {
        blunders: { white: number; black: number };
        aggressiveness: { white: number; black: number };
        captures: { white: number; black: number };
        checks: { white: number; black: number };
        materialDiff: number; // Positive = White advantage
    };
    processedAt: number;
}

const PIECE_VALUES: Record<string, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0
};

/**
 * Validates the PGN and extracts opening + simulates accuracy + calculates heuristics
 */
export async function processGameAnalysis(pgn: string): Promise<AnalysisResult> {
    return new Promise((resolve) => {
        setTimeout(() => {
            const chess = new Chess();
            try {
                chess.loadPgn(pgn);
            } catch (error) {
                console.error("Invalid PGN:", error);
                resolve(getErrorResult());
                return;
            }

            // 1. Basic Metadata
            const header = chess.header();
            const eco = header['ECO'] || "";
            const openingName = header['Opening'] || `ECO ${eco}` || "Unknown Opening";

            // 2. Traversal & Heuristics
            const moves = chess.history({ verbose: true });

            const stats = {
                captures: { white: 0, black: 0 },
                checks: { white: 0, black: 0 },
                blunders: { white: 0, black: 0 }
            };

            let materialBalance = 0; // + for white, - for black

            // Helper to get piece value from char (p, n, ...)
            const getVal = (p: string) => PIECE_VALUES[p?.toLowerCase()] || 0;

            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                const isWhite = move.color === 'w';
                const side = isWhite ? 'white' : 'black';

                // --- 2a. Aggression Stats ---
                if (move.flags.includes('c') || move.flags.includes('e')) {
                    stats.captures[side]++;
                    // Material Update (Approximation based on captured piece)
                    // Note: This is simpler than re-scanning board, but assumes we know what was captured.
                    // chess.js 'move' object has 'captured' property if it's a capture
                    if (move.captured) {
                        const val = getVal(move.captured);
                        materialBalance += isWhite ? val : -val;
                    }
                }

                if (move.san.includes('+') || move.san.includes('#')) {
                    stats.checks[side]++;
                }

                // --- 2b. Blunder Heuristic: "The Uncompensated Loss" ---
                // If I just made a move, let's see if my opponent captures a MAJOR piece (>=3) 
                // on their next turn, and I DON'T recapture immediately.
                if (i > 0) {
                    const prevMove = moves[i - 1]; // Opponent's move
                    const prevWasWhite = prevMove.color === 'w';

                    // If THIS move is a capture of a valuable piece (>=3)
                    if (move.captured && getVal(move.captured) >= 3) {
                        // Check if it was a trade (did opponent just capture something valuable too?)
                        // Heuristic: If opponent moved, and now I captured high value... 
                        // Actually, BLUNDER logic is: Did the *victim* (prev mover) leave a piece hanging?

                        // Let's look ahead: Did I (current mover) just punish a blunder?
                        // Yes, if I captured a big piece.
                        // BUT, did I pay for it? (Will opponent capture back next turn?)

                        const nextMove = (i + 1 < moves.length) ? moves[i + 1] : null;
                        const isTrade = nextMove && nextMove.captured && getVal(nextMove.captured) >= getVal(move.captured || 'p');

                        if (!isTrade) {
                            // "I captured a piece and didn't lose one back immediately"
                            // Means probable blunder by the VICTIM (previous mover)
                            stats.blunders[prevWasWhite ? 'white' : 'black']++;
                        }
                    }
                }
            }

            // 3. Derived Metrics
            const whiteMoves = moves.filter(m => m.color === 'w').length;
            const blackMoves = moves.filter(m => m.color === 'b').length;

            const aggroWhite = whiteMoves > 0 ? Math.round(((stats.captures.white + stats.checks.white) / whiteMoves) * 100) : 0;
            const aggroBlack = blackMoves > 0 ? Math.round(((stats.captures.black + stats.checks.black) / blackMoves) * 100) : 0;

            // 4. Simulated Accuracy (Re-using logic)
            // Existing logic or slightly refined
            const simulatedAcc = simulateAccuracy(header['Result'], moves.length);

            resolve({
                opening: openingName,
                accuracy: simulatedAcc,
                analysis: {
                    blunders: stats.blunders,
                    aggressiveness: { white: aggroWhite, black: aggroBlack },
                    captures: stats.captures,
                    checks: stats.checks,
                    materialDiff: materialBalance
                },
                processedAt: Date.now()
            });

        }, 1500);
    });
}

function getErrorResult(): AnalysisResult {
    return {
        opening: "Unknown",
        accuracy: { white: 0, black: 0 },
        analysis: {
            blunders: { white: 0, black: 0 },
            aggressiveness: { white: 0, black: 0 },
            captures: { white: 0, black: 0 },
            checks: { white: 0, black: 0 },
            materialDiff: 0
        },
        processedAt: Date.now()
    };
}

function simulateAccuracy(result: string, moveCount: number) {
    let whiteAcc = 70 + Math.random() * 25;
    let blackAcc = 70 + Math.random() * 25;

    if (result === '1-0') {
        whiteAcc = Math.min(99, whiteAcc + 5);
        blackAcc = Math.max(10, blackAcc - 10);
    } else if (result === '0-1') {
        blackAcc = Math.min(99, blackAcc + 5);
        whiteAcc = Math.max(10, whiteAcc - 10);
    }
    if (moveCount < 20) {
        whiteAcc = Math.min(99, whiteAcc + 5);
        blackAcc = Math.min(99, blackAcc + 5);
    }
    return { white: Math.round(whiteAcc), black: Math.round(blackAcc) };
}
