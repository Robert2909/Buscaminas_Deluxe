/**
 * Minesweeper Deluxe - Core Game Engine
 */

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
            this.rows = Math.max(8, Math.min(36, parseInt(this.customConfig.rows) || 10));
            this.cols = Math.max(8, Math.min(40, parseInt(this.customConfig.cols) || 12));
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
        this.lastExplodedCell = null;

        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push({
                    r,
                    c,
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
     * Generación garantizada de primer clic seguro
     * Despeja la celda inicial y preferentemente sus 8 vecinas (área 3x3)
     */
    generateMines(safeR, safeC) {
        const totalCells = this.rows * this.cols;
        const safeIndices = new Set();

        // Celda central siempre segura
        safeIndices.add(safeR * this.cols + safeC);

        // Si hay espacio suficiente, asegurar también los 8 vecinos inmediatos
        // para dar una apertura agradable (estilo Google)
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

        // Construir bolsa de índices elegibles para minas
        const candidateIndices = [];
        for (let i = 0; i < totalCells; i++) {
            if (!safeIndices.has(i)) {
                candidateIndices.push(i);
            }
        }

        // Barajado Fisher-Yates parcial para seleccionar las posiciones de minas
        let minesPlaced = 0;
        while (minesPlaced < this.totalMines && candidateIndices.length > 0) {
            const randIdx = Math.floor(Math.random() * candidateIndices.length);
            const chosen = candidateIndices.splice(randIdx, 1)[0];
            const r = Math.floor(chosen / this.cols);
            const c = chosen % this.cols;
            this.board[r][c].isMine = true;
            minesPlaced++;
        }

        // Si todavía faltaran minas (en tableros extremadamente densos)
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

        // Calcular minas vecinas para cada celda
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
        explodedCell.exploded = true;
        explodedCell.isRevealed = true;

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
        cascadeList.sort((a, b) => {
            const distA = Math.hypot(a.row - explodedCell.row, a.col - explodedCell.col);
            const distB = Math.hypot(b.row - explodedCell.row, b.col - explodedCell.col);
            return distA - distB;
        });

        // Revelar inmediatamente la mina que causó la derrota
        if (this.onCellUpdate) this.onCellUpdate(explodedCell, 0);
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

window.MinesweeperGame = MinesweeperGame;
