/**
 * NoGuessSolver - Solucionador Deductivo de Lógica Pura
 * Analiza un tablero de Buscaminas y determina si puede completarse
 * al 100% sin adivinar (cero 50/50) a partir de una casilla inicial.
 */
class NoGuessSolver {
    static isSolvable(rows, cols, minesArray, startR, startC) {
        let totalMines = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (minesArray[r][c]) totalMines++;
            }
        }
        const totalCells = rows * cols;
        const targetSafe = totalCells - totalMines;

        // Estado: -2 = oculta, -1 = mina confirmada/bandera, >= 0 = revelada con número
        const state = Array.from({ length: rows }, () => Array(cols).fill(-2));
        const neighborCount = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
                let cnt = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && minesArray[nr][nc]) {
                            cnt++;
                        }
                    }
                }
                return cnt;
            })
        );

        let revealedCount = 0;
        let flaggedCount = 0;
        let isValid = true;

        const reveal = (r, c) => {
            if (!isValid || state[r][c] !== -2) return;
            // Verificación estricta: Si se intenta revelar una mina real, la deducción fue inválida
            if (minesArray[r][c]) {
                isValid = false;
                return;
            }
            state[r][c] = neighborCount[r][c];
            revealedCount++;
            if (neighborCount[r][c] === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && state[nr][nc] === -2) {
                            reveal(nr, nc);
                        }
                    }
                }
            }
        };

        const flag = (r, c) => {
            if (!isValid || state[r][c] !== -2) return;
            // Verificación estricta: Si se intenta marcar una casilla sin mina, la deducción fue inválida
            if (!minesArray[r][c]) {
                isValid = false;
                return;
            }
            state[r][c] = -1;
            flaggedCount++;
        };

        reveal(startR, startC);

        let progress = true;
        while (progress && isValid && revealedCount < targetSafe) {
            progress = false;

            // 1. Deducciones directas por celda única
            const rawConstraints = [];

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (state[r][c] >= 0) {
                        const unrevealed = [];
                        let flags = 0;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                if (dr === 0 && dc === 0) continue;
                                const nr = r + dr, nc = c + dc;
                                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                                    if (state[nr][nc] === -2) {
                                        unrevealed.push(nr * cols + nc);
                                    } else if (state[nr][nc] === -1) {
                                        flags++;
                                    }
                                }
                            }
                        }

                        const needed = state[r][c] - flags;

                        if (unrevealed.length > 0) {
                            if (needed === 0) {
                                for (let i = 0; i < unrevealed.length; i++) {
                                    const idx = unrevealed[i];
                                    reveal(Math.floor(idx / cols), idx % cols);
                                }
                                progress = true;
                            } else if (needed === unrevealed.length) {
                                for (let i = 0; i < unrevealed.length; i++) {
                                    const idx = unrevealed[i];
                                    flag(Math.floor(idx / cols), idx % cols);
                                }
                                progress = true;
                            } else {
                                rawConstraints.push({ cells: unrevealed, sum: needed });
                            }
                        }
                    }
                }
            }

            if (progress || !isValid || revealedCount >= targetSafe) continue;

            // Deduplicar restricciones
            const constraints = [];
            const seen = new Set();
            for (let i = 0; i < rawConstraints.length; i++) {
                rawConstraints[i].cells.sort((a, b) => a - b);
                const key = rawConstraints[i].cells.join(',') + ':' + rawConstraints[i].sum;
                if (!seen.has(key)) {
                    seen.add(key);
                    constraints.push(rawConstraints[i]);
                }
            }

            // 2. Reducción matemática rigurosa de solapamiento de pares (Subconjuntos / 1-2 / 1-2-1)
            for (let i = 0; i < constraints.length; i++) {
                for (let j = i + 1; j < constraints.length; j++) {
                    const A = constraints[i];
                    const B = constraints[j];

                    const S = [];
                    const onlyA = [];
                    const onlyB = [];
                    let pA = 0, pB = 0;
                    while (pA < A.cells.length && pB < B.cells.length) {
                        if (A.cells[pA] === B.cells[pB]) {
                            S.push(A.cells[pA]);
                            pA++;
                            pB++;
                        } else if (A.cells[pA] < B.cells[pB]) {
                            onlyA.push(A.cells[pA]);
                            pA++;
                        } else {
                            onlyB.push(B.cells[pB]);
                            pB++;
                        }
                    }
                    while (pA < A.cells.length) onlyA.push(A.cells[pA++]);
                    while (pB < B.cells.length) onlyB.push(B.cells[pB++]);

                    if (S.length === 0) continue;

                    const minS = Math.max(0, A.sum - onlyA.length, B.sum - onlyB.length);
                    const maxS = Math.min(S.length, A.sum, B.sum);

                    // Reglas corregidas:
                    // onlyB son minas garantizadas si B.sum - maxS === onlyB.length
                    // onlyB son seguras garantizadas si B.sum - minS === 0
                    if (onlyB.length > 0) {
                        if (B.sum - maxS === onlyB.length) {
                            for (const idx of onlyB) flag(Math.floor(idx / cols), idx % cols);
                            progress = true;
                        }
                        if (B.sum - minS === 0) {
                            for (const idx of onlyB) reveal(Math.floor(idx / cols), idx % cols);
                            progress = true;
                        }
                    }

                    // onlyA son minas garantizadas si A.sum - maxS === onlyA.length
                    // onlyA son seguras garantizadas si A.sum - minS === 0
                    if (onlyA.length > 0) {
                        if (A.sum - maxS === onlyA.length) {
                            for (const idx of onlyA) flag(Math.floor(idx / cols), idx % cols);
                            progress = true;
                        }
                        if (A.sum - minS === 0) {
                            for (const idx of onlyA) reveal(Math.floor(idx / cols), idx % cols);
                            progress = true;
                        }
                    }

                    if (minS === S.length) {
                        for (const idx of S) flag(Math.floor(idx / cols), idx % cols);
                        progress = true;
                    }
                    if (maxS === 0) {
                        for (const idx of S) reveal(Math.floor(idx / cols), idx % cols);
                        progress = true;
                    }

                    if (progress) break;
                }
                if (progress) break;
            }

            if (progress || !isValid || revealedCount >= targetSafe) continue;

            // 3. Tank Solver (CSP / Backtracking exacto por componentes conectados)
            if (constraints.length > 0) {
                const cellToConstraints = new Map();
                for (let cIdx = 0; cIdx < constraints.length; cIdx++) {
                    for (const cell of constraints[cIdx].cells) {
                        if (!cellToConstraints.has(cell)) cellToConstraints.set(cell, []);
                        cellToConstraints.get(cell).push(cIdx);
                    }
                }

                const visitedCells = new Set();
                const components = [];

                for (const startCell of cellToConstraints.keys()) {
                    if (visitedCells.has(startCell)) continue;
                    const compCells = [];
                    const compConstraintIndices = new Set();
                    const queue = [startCell];
                    visitedCells.add(startCell);

                    while (queue.length > 0) {
                        const cell = queue.shift();
                        compCells.push(cell);
                        for (const cIdx of cellToConstraints.get(cell) || []) {
                            compConstraintIndices.add(cIdx);
                            for (const nextCell of constraints[cIdx].cells) {
                                if (!visitedCells.has(nextCell)) {
                                    visitedCells.add(nextCell);
                                    queue.push(nextCell);
                                }
                            }
                        }
                    }

                    components.push({
                        cells: compCells,
                        constraints: Array.from(compConstraintIndices).map(idx => constraints[idx])
                    });
                }

                for (const comp of components) {
                    if (comp.cells.length > 22) continue; // Límite de seguridad de rendimiento
                    const compCells = comp.cells;
                    const compConstraints = comp.constraints;
                    const cellIndexMap = new Map();
                    compCells.forEach((c, idx) => cellIndexMap.set(c, idx));

                    const fastConstraints = compConstraints.map(c => ({
                        indices: c.cells.map(cell => cellIndexMap.get(cell)),
                        sum: c.sum
                    }));

                    const remainingMines = totalMines - flaggedCount;
                    const cellMineCount = new Array(compCells.length).fill(0);
                    let validCombinations = 0;
                    const assignment = new Array(compCells.length).fill(0);

                    function backtrack(idx, currentMines) {
                        if (currentMines > remainingMines) return;
                        for (let c = 0; c < fastConstraints.length; c++) {
                            const fc = fastConstraints[c];
                            let assignedMines = 0;
                            let unassignedCount = 0;
                            for (let i = 0; i < fc.indices.length; i++) {
                                const cIdx = fc.indices[i];
                                if (cIdx < idx) assignedMines += assignment[cIdx];
                                else unassignedCount++;
                            }
                            if (assignedMines > fc.sum) return;
                            if (assignedMines + unassignedCount < fc.sum) return;
                        }

                        if (idx === compCells.length) {
                            validCombinations++;
                            for (let i = 0; i < compCells.length; i++) cellMineCount[i] += assignment[i];
                            return;
                        }

                        assignment[idx] = 0;
                        backtrack(idx + 1, currentMines);
                        assignment[idx] = 1;
                        backtrack(idx + 1, currentMines + 1);
                    }

                    backtrack(0, 0);

                    if (validCombinations > 0) {
                        for (let i = 0; i < compCells.length; i++) {
                            const cellIdx = compCells[i];
                            const r = Math.floor(cellIdx / cols);
                            const c = cellIdx % cols;
                            if (cellMineCount[i] === 0) {
                                reveal(r, c);
                                progress = true;
                            } else if (cellMineCount[i] === validCombinations) {
                                flag(r, c);
                                progress = true;
                            }
                        }
                    }
                    if (progress) break;
                }
            }

            if (progress || !isValid || revealedCount >= targetSafe) continue;

            // 4. Conteo Global de Minas Restantes (Final de juego e islas)
            const remainingMinesTotal = totalMines - flaggedCount;
            const allUnrevealed = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (state[r][c] === -2) allUnrevealed.push(r * cols + c);
                }
            }

            if (remainingMinesTotal === 0 && allUnrevealed.length > 0) {
                for (const idx of allUnrevealed) reveal(Math.floor(idx / cols), idx % cols);
                progress = true;
            } else if (remainingMinesTotal === allUnrevealed.length && allUnrevealed.length > 0) {
                for (const idx of allUnrevealed) flag(Math.floor(idx / cols), idx % cols);
                progress = true;
            }
        }

        const isFullySolvable = isValid && (revealedCount === targetSafe);
        return {
            solvable: isFullySolvable,
            revealedCount,
            targetSafe,
            state
        };
    }
}

class MinesweeperGame {
    static PRESETS = {
        easy: { rows: 8, cols: 10, mines: 10, label: 'Fácil' },
        medium: { rows: 14, cols: 18, mines: 40, label: 'Intermedio' },
        hard: { rows: 20, cols: 24, mines: 99, label: 'Difícil' },
        expert: { rows: 22, cols: 28, mines: 135, label: 'Extra Difícil' },
        legendary: { rows: 24, cols: 32, mines: 185, label: 'Legendario' },
        impossible: { rows: 26, cols: 36, mines: 245, label: 'Imposible' }
    };

    constructor(presetKey = 'easy', customConfig = null) {
        this.presetKey = presetKey;
        this.customConfig = customConfig;

        this.rows = 8;
        this.cols = 10;
        this.totalMines = 10;

        this.board = [];
        this.gameState = 'ready'; // 'ready', 'playing', 'won', 'lost'
        this.firstClick = true;
        this.flagsCount = 0;
        this.revealedCount = 0;
        this.targetReveals = 0;

        this.startTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;

        this.useQuestionMarks = false;
        this.practiceMode = false; // Permite deshacer si explota
        this.noGuessMode = true; // Modo No-Guess global por defecto
        this.isGuaranteedNoGuess = false;
        this.noGuessFallback = false;
        this.noGuessFallbackInfo = null;
        this.lastExplodedCell = null;

        // Callbacks de UI
        this.onStateChange = null;
        this.onCellUpdate = null;
        this.onTimerTick = null;
        this.onFlagsChange = null;
        this.onWin = null;
        this.onLoss = null;

        this.applyConfig();
        this.initBoard();
    }

    applyConfig() {
        if (this.presetKey === 'custom' && this.customConfig) {
            this.rows = Math.max(8, Math.min(64, parseInt(this.customConfig.rows) || 10));
            this.cols = Math.max(8, Math.min(64, parseInt(this.customConfig.cols) || 12));
            const maxMines = Math.floor(this.rows * this.cols * 0.85);
            this.totalMines = Math.max(1, Math.min(maxMines, parseInt(this.customConfig.mines) || 10));
        } else {
            const p = MinesweeperGame.PRESETS[this.presetKey] || MinesweeperGame.PRESETS.easy;
            this.rows = p.rows;
            this.cols = p.cols;
            this.totalMines = p.mines;
        }
        this.targetReveals = (this.rows * this.cols) - this.totalMines;
    }

    initBoard() {
        this.stopTimer();
        this.board = [];
        this.gameState = 'ready';
        this.firstClick = true;
        this.flagsCount = 0;
        this.revealedCount = 0;
        this.elapsedTime = 0;
        this.isGuaranteedNoGuess = false;
        this.noGuessFallback = false;
        this.noGuessFallbackInfo = null;
        this.lastExplodedCell = null;

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    r,
                    c,
                    row: r,
                    col: c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    isQuestion: false,
                    neighborMines: 0,
                    exploded: false
                });
            }
            this.board.push(row);
        }

        if (this.onFlagsChange) this.onFlagsChange(this.getRemainingMines());
        if (this.onTimerTick) this.onTimerTick(0);
        if (this.onStateChange) this.onStateChange(this.gameState);
    }

    /**
     * Generación de minas con soporte No-Guess global (sin 50/50)
     */
    generateMines(safeR, safeC) {
        if (this.noGuessMode) {
            const success = this.generateNoGuessMines(safeR, safeC);
            if (success) {
                this.isGuaranteedNoGuess = true;
                this.noGuessFallback = false;
                this.noGuessFallbackInfo = null;
                return;
            }
            // Fallback por fuerzas mayores tras agotar semillas y reparaciones
            this.isGuaranteedNoGuess = false;
            this.noGuessFallback = true;
            const totalCells = this.rows * this.cols;
            const density = Math.round((this.totalMines / totalCells) * 100);
            this.noGuessFallbackInfo = {
                rows: this.rows,
                cols: this.cols,
                totalMines: this.totalMines,
                densityPct: density,
                reason: `Tras agotar 25 semillas aleatorias y 40 reparaciones de frontera, la densidad elegida (${this.cols}×${this.rows}, ${this.totalMines} minas, ${density}% densidad) requirió conjeturas probabilísticas obligatorias (50/50). El tablero fue generado en modo clásico.`
            };
        } else {
            this.isGuaranteedNoGuess = false;
            this.noGuessFallback = false;
            this.noGuessFallbackInfo = null;
        }
        this.generateStandardMines(safeR, safeC);
    }

    /**
     * Algoritmo de Generación Garantizada No-Guess (100% resoluble por lógica deductiva pura)
     */
    generateNoGuessMines(safeR, safeC) {
        const totalCells = this.rows * this.cols;
        const safeIndices = new Set();
        safeIndices.add(safeR * this.cols + safeC);

        if (totalCells - 9 >= this.totalMines) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = safeR + dr;
                    const nc = safeC + dc;
                    if (this.isValidCell(nr, nc)) {
                        safeIndices.add(nr * this.cols + nc);
                    }
                }
            }
        }

        const candidateIndices = [];
        for (let i = 0; i < totalCells; i++) {
            if (!safeIndices.has(i)) {
                candidateIndices.push(i);
            }
        }

        // Semillas y bucle de reparación adaptativa de frontera
        const maxSeeds = 25;
        const maxRepairsPerSeed = 40;

        for (let seed = 0; seed < maxSeeds; seed++) {
            const candidateBoard = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
            const pool = [...candidateIndices];
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            for (let i = 0; i < this.totalMines; i++) {
                const chosen = pool[i];
                candidateBoard[Math.floor(chosen / this.cols)][chosen % this.cols] = true;
            }

            let result = NoGuessSolver.isSolvable(this.rows, this.cols, candidateBoard, safeR, safeC);
            if (result.solvable || result === true) {
                this.applyCandidateBoard(candidateBoard);
                return true;
            }

            // Bucle de reparación: detectar ambigüedad en la frontera y reubicar minas problemáticas
            for (let rep = 0; rep < maxRepairsPerSeed; rep++) {
                const frontierMines = [];
                const deepSafe = [];

                for (let r = 0; r < this.rows; r++) {
                    for (let c = 0; c < this.cols; c++) {
                        if (result.state && result.state[r][c] === -2) {
                            let touchesRevealed = false;
                            for (let dr = -1; dr <= 1; dr++) {
                                for (let dc = -1; dc <= 1; dc++) {
                                    const nr = r + dr, nc = c + dc;
                                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && result.state[nr][nc] >= 0) {
                                        touchesRevealed = true;
                                        break;
                                    }
                                }
                                if (touchesRevealed) break;
                            }
                            if (touchesRevealed && candidateBoard[r][c]) {
                                frontierMines.push({ r, c });
                            } else if (!touchesRevealed && !candidateBoard[r][c] && !safeIndices.has(r * this.cols + c)) {
                                deepSafe.push({ r, c });
                            }
                        }
                    }
                }

                if (frontierMines.length === 0 || deepSafe.length === 0) break;

                const fMine = frontierMines[Math.floor(Math.random() * frontierMines.length)];
                const dSafe = deepSafe[Math.floor(Math.random() * deepSafe.length)];
                candidateBoard[fMine.r][fMine.c] = false;
                candidateBoard[dSafe.r][dSafe.c] = true;

                result = NoGuessSolver.isSolvable(this.rows, this.cols, candidateBoard, safeR, safeC);
                if (result.solvable || result === true) {
                    this.applyCandidateBoard(candidateBoard);
                    return true;
                }
            }
        }

        return false;
    }

    applyCandidateBoard(candidateBoard) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.board[r][c].isMine = candidateBoard[r][c];
            }
        }
        this.calculateNeighborMines();
    }

    generateStandardMines(safeR, safeC) {
        const totalCells = this.rows * this.cols;
        const safeIndices = new Set();
        safeIndices.add(safeR * this.cols + safeC);

        if (totalCells - 9 >= this.totalMines) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = safeR + dr;
                    const nc = safeC + dc;
                    if (this.isValidCell(nr, nc)) {
                        safeIndices.add(nr * this.cols + nc);
                    }
                }
            }
        }

        const candidateIndices = [];
        for (let i = 0; i < totalCells; i++) {
            if (!safeIndices.has(i)) {
                candidateIndices.push(i);
            }
        }

        let minesPlaced = 0;
        while (minesPlaced < this.totalMines && candidateIndices.length > 0) {
            const randIdx = Math.floor(Math.random() * candidateIndices.length);
            const chosen = candidateIndices.splice(randIdx, 1)[0];
            const r = Math.floor(chosen / this.cols);
            const c = chosen % this.cols;
            this.board[r][c].isMine = true;
            minesPlaced++;
        }

        if (minesPlaced < this.totalMines) {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (minesPlaced >= this.totalMines) break;
                    if (r === safeR && c === safeC) continue;
                    if (!this.board[r][c].isMine) {
                        this.board[r][c].isMine = true;
                        minesPlaced++;
                    }
                }
            }
        }

        this.calculateNeighborMines();
    }

    calculateNeighborMines() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].isMine) continue;
                let count = 0;
                this.forEachNeighbor(r, c, (neighbor) => {
                    if (neighbor.isMine) count++;
                });
                this.board[r][c].neighborMines = count;
            }
        }
    }

    startTimer() {
        this.startTime = Date.now() - (this.elapsedTime * 1000);
        this.timerInterval = setInterval(() => {
            if (this.gameState === 'playing') {
                const secs = Math.floor((Date.now() - this.startTime) / 1000);
                this.elapsedTime = Math.min(9999, secs);
                if (this.onTimerTick) this.onTimerTick(this.elapsedTime);
            }
        }, 200);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Cavar / Revelar celda
     */
    dig(r, c) {
        if (this.gameState === 'won' || this.gameState === 'lost') return false;
        if (!this.isValidCell(r, c)) return false;

        const cell = this.board[r][c];

        // Las banderas protegen de clics accidentales
        if (cell.isFlagged) return false;

        // Primer clic
        if (this.firstClick) {
            this.firstClick = false;
            this.gameState = 'playing';
            this.generateMines(r, c);
            this.startTimer();
            if (this.onStateChange) this.onStateChange(this.gameState);
        }

        // Si ya está revelada, intentar acorde (chording)
        if (cell.isRevealed) {
            return this.chord(r, c);
        }

        // Celda con mina -> Fin de juego
        if (cell.isMine) {
            this.triggerLoss(cell);
            return false;
        }

        // Revelar celda segura con efecto cascada
        this.revealCellSafe(r, c);
        this.checkWinCondition();
        return true;
    }

    /**
     * Revelado recursivo / en cascada por capas (estilo onda de Google)
     */
    revealCellSafe(startR, startC) {
        const startCell = this.board[startR][startC];
        if (startCell.isRevealed || startCell.isFlagged) return;

        // Cola BFS con cálculo de distancia para la animación en onda
        const queue = [{ cell: startCell, dist: 0 }];
        const visited = new Set();
        visited.add(`${startR},${startC}`);

        let maxDelay = 0;
        const soundIntervals = [];

        while (queue.length > 0) {
            const { cell, dist } = queue.shift();

            if (!cell.isRevealed && !cell.isFlagged) {
                cell.isRevealed = true;
                this.revealedCount++;

                // Pequeño retardo escalonado de 22ms por distancia de propagación
                const delay = Math.min(dist * 24, 380);
                maxDelay = Math.max(maxDelay, delay);

                if (this.onCellUpdate) {
                    this.onCellUpdate(cell, delay);
                }

                // Si no tiene minas alrededor, propagar a sus vecinos
                if (cell.neighborMines === 0 && !cell.isMine) {
                    this.forEachNeighbor(cell.r, cell.c, (neighbor) => {
                        const key = `${neighbor.r},${neighbor.c}`;
                        if (!visited.has(key) && !neighbor.isRevealed && !neighbor.isFlagged) {
                            visited.add(key);
                            queue.push({ cell: neighbor, dist: dist + 1 });
                        }
                    });
                }
            }
        }

        return maxDelay;
    }

    /**
     * Chording: si las banderas adyacentes igualan el número, revelar el resto
     */
    chord(r, c) {
        const cell = this.board[r][c];
        if (!cell.isRevealed || cell.neighborMines === 0) return false;

        let flagsCount = 0;
        const neighborsToReveal = [];

        this.forEachNeighbor(r, c, (n) => {
            if (n.isFlagged) flagsCount++;
            else if (!n.isRevealed) neighborsToReveal.push(n);
        });

        if (flagsCount === cell.neighborMines && neighborsToReveal.length > 0) {
            let hitMine = false;
            let mineCell = null;

            neighborsToReveal.forEach(n => {
                if (n.isMine) {
                    hitMine = true;
                    mineCell = n;
                }
            });

            if (hitMine) {
                this.triggerLoss(mineCell);
                return false;
            }

            neighborsToReveal.forEach(n => {
                this.revealCellSafe(n.r, n.c);
            });

            this.checkWinCondition();
            return true;
        }

        return false;
    }

    /**
     * Alternar estado de bandera / interrogación
     */
    toggleFlag(r, c) {
        if (this.gameState !== 'playing' && this.gameState !== 'ready') return null;
        if (!this.isValidCell(r, c)) return null;

        const cell = this.board[r][c];
        if (cell.isRevealed) return null;

        let action = '';

        if (!cell.isFlagged && !cell.isQuestion) {
            cell.isFlagged = true;
            this.flagsCount++;
            action = 'flag';
        } else if (cell.isFlagged && this.useQuestionMarks) {
            cell.isFlagged = false;
            cell.isQuestion = true;
            this.flagsCount--;
            action = 'question';
        } else {
            if (cell.isFlagged) this.flagsCount--;
            cell.isFlagged = false;
            cell.isQuestion = false;
            action = 'unflag';
        }

        if (this.onFlagsChange) this.onFlagsChange(this.getRemainingMines());
        if (this.onCellUpdate) this.onCellUpdate(cell, 0);

        return action;
    }

    checkWinCondition() {
        if (this.revealedCount >= this.targetReveals && this.gameState === 'playing') {
            this.gameState = 'won';
            this.stopTimer();

            // Auto-banderas en todas las minas
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const cell = this.board[r][c];
                    if (cell.isMine && !cell.isFlagged) {
                        cell.isFlagged = true;
                        if (this.onCellUpdate) this.onCellUpdate(cell, 0);
                    }
                }
            }

            this.flagsCount = this.totalMines;
            if (this.onFlagsChange) this.onFlagsChange(0);
            if (this.onStateChange) this.onStateChange(this.gameState);
            if (this.onWin) this.onWin({ time: this.elapsedTime, preset: this.presetKey });
        }
    }

    triggerLoss(explodedCell) {
        this.gameState = 'lost';
        this.stopTimer();
        this.lastExplodedCell = explodedCell;
        if (explodedCell) {
            explodedCell.exploded = true;
            explodedCell.isRevealed = true;
        }

        // Recolectar minas no marcadas y banderas incorrectas ordenadas por cercanía radial
        const cascadeList = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                if (cell === explodedCell) continue;
                if (cell.isMine && !cell.isFlagged) {
                    cascadeList.push(cell);
                } else if (!cell.isMine && cell.isFlagged) {
                    cascadeList.push(cell);
                }
            }
        }

        // Ordenar por distancia euclidiana desde la mina inicial para la onda expansiva
        const expR = (explodedCell && typeof explodedCell.row === 'number') ? explodedCell.row : (explodedCell?.r ?? 0);
        const expC = (explodedCell && typeof explodedCell.col === 'number') ? explodedCell.col : (explodedCell?.c ?? 0);
        cascadeList.sort((a, b) => {
            const ar = (typeof a.row === 'number') ? a.row : (a.r ?? 0);
            const ac = (typeof a.col === 'number') ? a.col : (a.c ?? 0);
            const br = (typeof b.row === 'number') ? b.row : (b.r ?? 0);
            const bc = (typeof b.col === 'number') ? b.col : (b.c ?? 0);
            const distA = Math.hypot(ar - expR, ac - expC);
            const distB = Math.hypot(br - expR, bc - expC);
            return distA - distB;
        });

        // Revelar inmediatamente la mina que causó la derrota
        if (explodedCell && this.onCellUpdate) this.onCellUpdate(explodedCell, 0);
        if (this.onStateChange) this.onStateChange(this.gameState);
        if (this.onLoss) this.onLoss(explodedCell, cascadeList);
    }

    /**
     * Deshacer última explosión (Modo práctica)
     */
    undoExplosion() {
        if (this.gameState !== 'lost' || !this.lastExplodedCell) return false;

        this.lastExplodedCell.exploded = false;
        this.lastExplodedCell.isFlagged = true;
        this.flagsCount++;

        // Ocultar minas reveladas por la derrota
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                if (cell.isMine && cell !== this.lastExplodedCell) {
                    cell.isRevealed = false;
                    if (this.onCellUpdate) this.onCellUpdate(cell, 0);
                }
                if (cell.wrongFlag) {
                    cell.wrongFlag = false;
                    if (this.onCellUpdate) this.onCellUpdate(cell, 0);
                }
            }
        }

        if (this.onCellUpdate) this.onCellUpdate(this.lastExplodedCell, 0);

        this.gameState = 'playing';
        this.startTimer();
        if (this.onFlagsChange) this.onFlagsChange(this.getRemainingMines());
        if (this.onStateChange) this.onStateChange(this.gameState);
        return true;
    }

    getRemainingMines() {
        return this.totalMines - this.flagsCount;
    }

    isValidCell(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    forEachNeighbor(r, c, callback) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (this.isValidCell(nr, nc)) {
                    callback(this.board[nr][nc]);
                }
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.MinesweeperGame = MinesweeperGame;
    window.NoGuessSolver = NoGuessSolver;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MinesweeperGame, NoGuessSolver };
}
