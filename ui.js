/**
 * Minesweeper Deluxe - User Interface & Interaction Engine
 * Pantalla completa, SVGs puros (cero emojis) y atajos de teclado globales
 */

class MinesweeperUI {
    constructor() {
        this.game = null;

        // Validar e inicializar temas con integridad de memoria local
        const VALID_THEMES = ['google-garden', 'corporate-pro', 'vscode', 'retro95', 'cyberpunk-neon', 'dark-glass', 'sunset-desert', 'nordic-frost'];
        const savedTheme = localStorage.getItem('ms_theme');
        this.currentTheme = VALID_THEMES.includes(savedTheme) ? savedTheme : 'google-garden';

        // Validar e inicializar niveles de dificultad
        const VALID_PRESETS = ['easy', 'medium', 'hard', 'expert', 'legendary', 'impossible', 'custom'];
        const savedPreset = localStorage.getItem('ms_preset');
        this.currentPreset = VALID_PRESETS.includes(savedPreset) ? savedPreset : 'easy';

        // Carga segura y validada de configuración personalizada
        try {
            const rawCustom = localStorage.getItem('ms_custom_config');
            this.customConfig = rawCustom ? JSON.parse(rawCustom) : { rows: 12, cols: 16, mines: 24 };
            this.customConfig.rows = Math.min(36, Math.max(8, parseInt(this.customConfig.rows) || 12));
            this.customConfig.cols = Math.min(40, Math.max(8, parseInt(this.customConfig.cols) || 16));
            const maxMines = Math.floor(this.customConfig.rows * this.customConfig.cols * 0.85);
            this.customConfig.mines = Math.min(maxMines, Math.max(1, parseInt(this.customConfig.mines) || 24));
        } catch (e) {
            this.customConfig = { rows: 12, cols: 16, mines: 24 };
        }

        // Carga segura de modo de control
        const savedMode = localStorage.getItem('ms_control_mode');
        this.controlMode = (savedMode === 'flag') ? 'flag' : 'dig';

        this.hoveredCell = null;
        this.longPressTimer = null;
        this.longPressThreshold = 350;
        this.lossCascadeTimeouts = [];

        // Referencias a elementos DOM
        this.boardContainer = document.getElementById('board-container');
        this.boardViewport = document.getElementById('board-viewport');
        this.boardElement = document.getElementById('game-board');
        this.faceBtn = document.getElementById('face-btn');
        this.timerDisplay = document.getElementById('timer-display');
        this.minesDisplay = document.getElementById('mines-display');
        this.modeToggleBtn = document.getElementById('mode-toggle-btn');
        this.presetTabs = document.querySelectorAll('.preset-tab');
        this.undoBtn = document.getElementById('undo-btn');
        this.endgamePopup = document.getElementById('endgame-popup');
        this.reopenEndgameBtn = document.getElementById('reopen-endgame-btn');

        // Modales
        this.settingsModal = document.getElementById('settings-modal');
        this.statsModal = document.getElementById('stats-modal');
        this.customModal = document.getElementById('custom-modal');
        this.helpModal = document.getElementById('help-modal');

        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.setupPresetTabs();
        this.setupShortcuts();
        this.setupResizeObserver();
        this.loadSettings();
        this.updateSoundButton();
        this.updateModeButton();
        this.updateFullscreenButton();
        this.startNewGame(this.currentPreset);
    }

    applyTheme(theme) {
        const VALID_THEMES = ['google-garden', 'corporate-pro', 'vscode', 'retro95', 'cyberpunk-neon', 'dark-glass', 'sunset-desert', 'nordic-frost'];
        if (!VALID_THEMES.includes(theme)) {
            theme = 'google-garden';
        }
        this.currentTheme = theme;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('ms_theme', theme);

        const themeColors = {
            'google-garden': '#4a752c',
            'corporate-pro': '#f8fafc',
            'vscode': '#1e1e1e',
            'retro95': '#c0c0c0',
            'cyberpunk-neon': '#080d1a',
            'dark-glass': '#0f172a',
            'sunset-desert': '#6d2c1d',
            'nordic-frost': '#06182b'
        };
        const metaTheme = document.getElementById('meta-theme-color');
        if (metaTheme && themeColors[theme]) {
            metaTheme.setAttribute('content', themeColors[theme]);
        }

        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.theme === theme);
        });

        if (this.game && this.game.board) {
            for (let r = 0; r < this.game.rows; r++) {
                for (let c = 0; c < this.game.cols; c++) {
                    const cell = this.game.board[r][c];
                    if (cell.isFlagged || cell.isRevealed) {
                        this.renderCell(cell, 0);
                    }
                }
            }
        }
        if (this.faceBtn) {
            this.updateFace(this.game ? this.game.gameState : 'playing');
        }
    }

    setupPresetTabs() {
        // Sincronizar pestaña visual activa con el preset guardado en memoria local
        this.presetTabs.forEach(t => t.classList.toggle('active', t.dataset.preset === this.currentPreset));

        this.presetTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const preset = tab.dataset.preset;
                if (preset === 'custom') {
                    this.openModal(this.customModal);
                } else {
                    this.presetTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.currentPreset = preset;
                    localStorage.setItem('ms_preset', preset);
                    this.startNewGame(preset);
                }
            });
        });
    }

    setupResizeObserver() {
        if (window.ResizeObserver && this.boardViewport) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateBoardDimensions();
            });
            this.resizeObserver.observe(this.boardViewport);
        }
        window.addEventListener('resize', () => {
            this.updateBoardDimensions();
        });
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
            setTimeout(() => this.updateBoardDimensions(), 100);
        });
    }

    updateBoardDimensions() {
        if (!this.boardViewport || !this.boardElement || !this.game) return;

        const padX = 16;
        const padY = 16;
        const availW = Math.max(80, this.boardViewport.clientWidth - padX);
        const availH = Math.max(80, this.boardViewport.clientHeight - padY);

        const maxCellW = Math.floor(availW / this.game.cols);
        const maxCellH = Math.floor(availH / this.game.rows);

        const optimalCellSize = Math.max(16, Math.min(68, Math.min(maxCellW, maxCellH)));

        this.boardElement.style.setProperty('--cell-size', `${optimalCellSize}px`);
        this.boardElement.style.setProperty('--grid-rows', this.game.rows);
        this.boardElement.style.setProperty('--grid-cols', this.game.cols);
    }

    clearLossCascadeTimeouts() {
        if (this.lossCascadeTimeouts && this.lossCascadeTimeouts.length > 0) {
            this.lossCascadeTimeouts.forEach(id => clearTimeout(id));
            this.lossCascadeTimeouts = [];
        }
    }

    triggerBoardResetAnimation() {
        if (!this.boardViewport || !this.boardElement) return;

        // Micro-animación de entrada limpia para el contenedor del tablero
        this.boardElement.classList.remove('board-reset-pop');
        void this.boardElement.offsetWidth;
        this.boardElement.classList.add('board-reset-pop');

        // Haz de barrido luminoso minimalista que recubre todo el campo
        let sweep = this.boardViewport.querySelector('.board-reset-sweep');
        if (!sweep) {
            sweep = document.createElement('div');
            sweep.className = 'board-reset-sweep';
            this.boardViewport.appendChild(sweep);
        }
        sweep.classList.remove('animate-board-sweep');
        void sweep.offsetWidth;
        sweep.classList.add('animate-board-sweep');
    }

    startNewGame(preset = this.currentPreset, customConfig = this.customConfig) {
        this.clearLossCascadeTimeouts();
        this.hideEndgamePopup();
        this.hideToast();
        if (this.game) {
            this.game.stopTimer();
        }

        this.game = new MinesweeperGame(preset, customConfig);
        this.presetTabs.forEach(t => t.classList.toggle('active', t.dataset.preset === preset));

        const useQ = localStorage.getItem('ms_use_questions') === 'true';
        const practice = localStorage.getItem('ms_practice_mode') === 'true';
        this.game.useQuestionMarks = useQ;
        this.game.practiceMode = practice;

        this.game.onStateChange = (state) => this.updateFace(state);
        this.game.onCellUpdate = (cell, delay) => this.renderCell(cell, delay);
        this.game.onTimerTick = (seconds) => this.renderTimer(seconds);
        this.game.onFlagsChange = (count) => this.renderMinesCount(count);
        this.game.onWin = (info) => this.handleWin(info);
        this.game.onLoss = (cell, cascadeList) => this.handleLoss(cell, cascadeList);

        this.renderBoardStructure();
        this.updateBoardDimensions();
        this.triggerBoardResetAnimation();
        this.updateFace('ready');
        this.renderMinesCount(this.game.getRemainingMines());
        this.renderTimer(0);
        this.updateUndoButtonVisibility();
    }

    renderBoardStructure() {
        this.boardElement.innerHTML = '';
        this.updateBoardDimensions();

        this.cellElements = [];
        for (let r = 0; r < this.game.rows; r++) {
            this.cellElements[r] = [];
            for (let c = 0; c < this.game.cols; c++) {
                const cell = this.game.board[r][c];
                const el = document.createElement('div');
                el.className = `cell unrevealed ${(r + c) % 2 === 0 ? 'cell-even' : 'cell-odd'}`;
                el.dataset.row = r;
                el.dataset.col = c;
                el.setAttribute('role', 'button');
                el.setAttribute('aria-label', `Fila ${r + 1}, Columna ${c + 1}`);

                this.bindCellEvents(el, r, c);
                this.boardElement.appendChild(el);
                this.cellElements[r][c] = el;
            }
        }
    }

    bindCellEvents(el, r, c) {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.controlMode === 'flag') {
                this.handleFlagAction(r, c);
            } else {
                this.handleDigAction(r, c);
            }
        });

        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleFlagAction(r, c);
        });

        el.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.game.gameState !== 'lost' && this.game.gameState !== 'won') {
                this.updateFace('holding');
            }
        });

        el.addEventListener('mouseup', () => {
            if (this.game.gameState !== 'lost' && this.game.gameState !== 'won') {
                this.updateFace(this.game.gameState);
            }
        });

        el.addEventListener('mouseenter', () => {
            this.hoveredCell = { r, c };
            if (el.classList.contains('revealed') && parseInt(el.dataset.number) > 0) {
                this.highlightChordNeighbors(r, c, true);
            }
        });

        el.addEventListener('mouseleave', () => {
            this.hoveredCell = null;
            this.highlightChordNeighbors(r, c, false);
            if (this.game.gameState !== 'lost' && this.game.gameState !== 'won') {
                this.updateFace(this.game.gameState);
            }
        });

        el.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.longPressTriggered = false;
                this.longPressTimer = setTimeout(() => {
                    this.longPressTriggered = true;
                    if (navigator.vibrate) navigator.vibrate(40);
                    this.handleFlagAction(r, c);
                }, this.longPressThreshold);
            }
        }, { passive: true });

        el.addEventListener('touchend', (e) => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            if (this.longPressTriggered) {
                e.preventDefault();
            }
        });

        el.addEventListener('touchmove', () => {
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }, { passive: true });
    }

    handleDigAction(r, c) {
        if (!this.game || this.game.gameState === 'won' || this.game.gameState === 'lost') return;

        const cell = this.game.board[r][c];
        if (cell.isFlagged) return;

        if (cell.isRevealed) {
            const chordResult = this.game.chord(r, c);
            if (chordResult) {
                window.soundEngine?.playChord();
            }
            return;
        }

        const success = this.game.dig(r, c);
        if (success) {
            window.soundEngine?.playDig();
        }
    }

    handleFlagAction(r, c) {
        if (!this.game || this.game.gameState === 'won' || this.game.gameState === 'lost') return;

        const action = this.game.toggleFlag(r, c);
        if (action === 'flag') {
            window.soundEngine?.playFlag();
        } else if (action === 'unflag') {
            window.soundEngine?.playUnflag();
        } else if (action === 'question') {
            window.soundEngine?.playDig(1.5);
        }
    }

    highlightChordNeighbors(r, c, highlight) {
        this.game.forEachNeighbor(r, c, (n) => {
            if (!n.isRevealed && !n.isFlagged) {
                const el = this.cellElements[n.r][n.c];
                el.classList.toggle('chord-hover', highlight);
            }
        });
    }

    renderCell(cell, delay = 0) {
        const el = this.cellElements[cell.r][cell.c];
        if (!el) return;

        if (delay > 0) {
            setTimeout(() => {
                this.applyCellRender(el, cell);
                if (cell.neighborMines === 0 && !cell.isMine) {
                    window.soundEngine?.playCascadeNote();
                }
            }, delay);
        } else {
            this.applyCellRender(el, cell);
        }
    }

    applyCellRender(el, cell) {
        el.className = `cell ${(cell.r + cell.c) % 2 === 0 ? 'cell-even' : 'cell-odd'}`;
        el.innerHTML = '';
        el.dataset.number = '';

        if (cell.isRevealed) {
            el.classList.add('revealed');
            el.classList.add('pop-in');

            if (cell.isMine) {
                el.classList.add('mine');
                if (cell.exploded) {
                    el.classList.add('exploded');
                    el.innerHTML = this.getMineIcon(true);
                } else {
                    el.innerHTML = this.getMineIcon(false);
                }
            } else if (cell.neighborMines > 0) {
                el.classList.add(`num-${cell.neighborMines}`);
                el.dataset.number = cell.neighborMines;
                el.innerHTML = `<span>${cell.neighborMines}</span>`;
            }
        } else {
            el.classList.add('unrevealed');

            if (cell.isFlagged) {
                el.classList.add('flagged');
                el.innerHTML = this.getFlagIcon();
            } else if (cell.isQuestion) {
                el.classList.add('question');
                el.innerHTML = '<span class="question-mark">?</span>';
            } else if (cell.wrongFlag) {
                el.classList.add('wrong-flag');
                el.innerHTML = this.getWrongFlagIcon();
            }
        }
    }

    getFlagIcon() {
        if (this.currentTheme === 'nordic-frost') {
            return `
                <svg class="flag-svg flag-nordic" viewBox="0 0 24 24" fill="none">
                    <line x1="5.5" y1="3" x2="5.5" y2="21" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M6.5 3.8C10 2.2 13.5 5 19 3.8L17.5 11.2C13.5 12.4 9.5 9.8 6.5 10.8V3.8Z" fill="#0284c7"/>
                    <path d="M6.5 4.5C9.5 3.5 12.5 5.5 16.5 4.8L15.5 8.5C12.5 9 9.5 7.2 6.5 8V4.5Z" fill="#38bdf8" opacity="0.6"/>
                    <circle cx="5.5" cy="3.5" r="1.6" fill="#e0f2fe"/>
                    <rect x="3" y="19.5" width="5.5" height="2" rx="1" fill="#7dd3fc"/>
                </svg>
            `;
        }
        if (this.currentTheme === 'corporate-pro') {
            return `
                <svg class="flag-svg flag-corporate" viewBox="0 0 24 24" fill="none">
                    <line x1="5.5" y1="3" x2="5.5" y2="21" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
                    <path d="M6.5 4C10 2.6 13.5 5.4 19 4L17 11.5C12.5 12.8 9.5 10 6.5 11.2V4Z" fill="#2563eb"/>
                    <circle cx="5.5" cy="3.5" r="1.5" fill="#0f172a"/>
                    <rect x="3" y="19.5" width="5.5" height="2" rx="1" fill="#64748b"/>
                </svg>
            `;
        }
        if (this.currentTheme === 'vscode') {
            return `
                <svg class="flag-svg vscode-breakpoint" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" fill="#E51400"/>
                    <circle cx="12" cy="12" r="3.5" fill="#FFFFFF" opacity="0.9"/>
                </svg>
            `;
        }
        if (this.currentTheme === 'retro95') {
            return `
                <svg class="flag-svg flag-retro95" viewBox="0 0 24 24" fill="none">
                    <polygon points="5,3 17,8.5 5,14" fill="#FF0000"/>
                    <line x1="5" y1="3" x2="5" y2="20" stroke="#000000" stroke-width="2.2" stroke-linecap="square"/>
                    <rect x="2" y="17" width="8" height="2" fill="#000000"/>
                    <rect x="1" y="19" width="10" height="2" fill="#000000"/>
                </svg>
            `;
        }
        return `
            <svg class="flag-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 21V4C4 3.44772 4.44772 3 5 3H6V21H4Z" fill="#5D4037"/>
                <path class="flag-banner" d="M6 4C10 2.5 13 5.5 19 4L17 11C13 12.5 10 9.5 6 11V4Z" fill="#E53935"/>
                <circle cx="5" cy="3" r="1.5" fill="#FFD54F"/>
                <rect x="2" y="20" width="8" height="2" rx="1" fill="#795548"/>
            </svg>
        `;
    }

    getMineIcon(exploded = false) {
        if (this.currentTheme === 'nordic-frost') {
            return exploded ? `
                <svg class="mine-svg mine-nordic-exploded" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" fill="#0284c7" opacity="0.3"/>
                    <path d="M12 2l2 4 4-2-1 4.5 4.5 1-3.5 3 3.5 3-4.5 1 1 4.5-4-2-2 4-2-4-4 2 1-4.5-4.5-1 3.5-3-3.5-3 4.5-1-1-4.5 4 2z" fill="#38bdf8"/>
                    <circle cx="12" cy="12" r="4.5" fill="#f0f9ff"/>
                    <circle cx="12" cy="12" r="2.2" fill="#0284c7"/>
                </svg>
            ` : `
                <svg class="mine-svg mine-nordic" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="6" fill="#0c4a6e"/>
                    <circle cx="12" cy="12" r="3.2" fill="#38bdf8"/>
                    <path d="M12 2.5v3.5m0 12v3.5M2.5 12h3.5m12 0h3.5M5.3 5.3l2.5 2.5m8.4 8.4l2.5 2.5M5.3 18.7l2.5-2.5m8.4-8.4l2.5-2.5" stroke="#7dd3fc" stroke-width="1.8" stroke-linecap="round"/>
                    <circle cx="10" cy="10" r="1.1" fill="#ffffff"/>
                </svg>
            `;
        }

        if (this.currentTheme === 'corporate-pro') {
            return exploded ? `
                <svg class="mine-svg mine-corporate-exploded" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" fill="#fee2e2"/>
                    <circle cx="12" cy="12" r="6" fill="#dc2626"/>
                    <path d="M12 2.5v3.5m0 12v3.5M2.5 12h3.5m12 0h3.5M5.3 5.3l2.5 2.5m8.4 8.4l2.5 2.5M5.3 18.7l2.5-2.5m8.4-8.4l2.5-2.5" stroke="#dc2626" stroke-width="2.2" stroke-linecap="round"/>
                    <circle cx="12" cy="12" r="2.2" fill="#ffffff"/>
                </svg>
            ` : `
                <svg class="mine-svg mine-corporate" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="6.2" fill="#0f172a"/>
                    <circle cx="12" cy="12" r="2.8" fill="#2563eb"/>
                    <path d="M12 2.5v3m0 13v3M2.5 12h3m13 0h3M5.3 5.3l2.1 2.1m9.2 9.2l2.1 2.1M5.3 18.7l2.1-2.1m9.2-9.2l2.1-2.1" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="10" cy="10" r="1" fill="#ffffff" opacity="0.85"/>
                </svg>
            `;
        }

        if (this.currentTheme === 'vscode') {
            return `
                <svg class="mine-svg vscode-bug ${exploded ? 'mine-exploded' : ''}" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 8h-1.81a5.985 5.985 0 0 0-1.82-1.96l1.39-1.39a.996.996 0 1 0-1.41-1.41l-1.6 1.6A5.928 5.928 0 0 0 12 4.5c-.61 0-1.2.09-1.75.24l-1.6-1.6a.996.996 0 1 0-1.41 1.41l1.39 1.39A5.985 5.985 0 0 0 6.81 8H5a1 1 0 0 0 0 2h1.09c-.05.33-.09.66-.09 1v1H4a1 1 0 0 0 0 2h2v1c0 .34.04.67.09 1H5a1 1 0 0 0 0 2h1.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H19a1 1 0 0 0 0-2h-1.09c.05-.33.09-.66.09-1v-1h2a1 1 0 0 0 0-2h-2v-1c0-.34-.04-.67-.09-1H19a1 1 0 0 0 0-2zm-6 10c-2.21 0-4-1.79-4-4v-3c0-2.21 1.79-4 4-4s4 1.79 4 4v3c0 2.21-1.79 4-4 4z"/>
                </svg>
            `;
        }

        if (this.currentTheme === 'retro95') {
            return `
                <svg class="mine-svg mine-retro95 ${exploded ? 'mine-exploded' : ''}" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="6" fill="#000000"/>
                    <line x1="12" y1="2" x2="12" y2="22" stroke="#000000" stroke-width="2.4"/>
                    <line x1="2" y1="12" x2="22" y2="12" stroke="#000000" stroke-width="2.4"/>
                    <line x1="5" y1="5" x2="19" y2="19" stroke="#000000" stroke-width="2.4"/>
                    <line x1="19" y1="5" x2="5" y2="19" stroke="#000000" stroke-width="2.4"/>
                    <rect x="9" y="9" width="3" height="3" fill="#FFFFFF"/>
                </svg>
            `;
        }

        if (this.currentTheme === 'google-garden') {
            return exploded ? `
                <svg class="mine-svg explosion-burst-svg" viewBox="0 0 24 24">
                    <path d="M12 2l2.5 5.5L20 5l-2.5 6 6 1.5-5.5 3.5 3 6-6-2.5-3.5 5.5-2.5-5.5-6 2.5 3-6-5.5-3.5 6-1.5L5 5l5.5 2.5z" fill="#FF5722"/>
                    <circle cx="12" cy="12" r="4.5" fill="#FFEB3B"/>
                </svg>
            ` : `
                <svg class="mine-svg flower-mine" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4.5" fill="#2E3440"/>
                    <circle cx="12" cy="6" r="2.5" fill="#E53935"/>
                    <circle cx="18" cy="12" r="2.5" fill="#E53935"/>
                    <circle cx="12" cy="18" r="2.5" fill="#E53935"/>
                    <circle cx="6" cy="12" r="2.5" fill="#E53935"/>
                    <circle cx="12" cy="12" r="2.2" fill="#FFEB3B"/>
                </svg>
            `;
        }

        return `
            <svg class="mine-svg classic-mine ${exploded ? 'mine-exploded' : ''}" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6" fill="currentColor"/>
                <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="10" cy="10" r="1.5" fill="#FFFFFF"/>
            </svg>
        `;
    }

    getWrongFlagIcon() {
        return `
            <div class="wrong-flag-wrapper">
                ${this.getFlagIcon()}
                <svg class="wrong-x-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#D32F2F" stroke-width="3" stroke-linecap="round">
                    <line x1="5" y1="5" x2="19" y2="19"/>
                    <line x1="19" y1="5" x2="5" y2="19"/>
                </svg>
            </div>
        `;
    }

    updateFace(state) {
        const faceWrapper = this.faceBtn.querySelector('.face-svg-wrapper') || this.faceBtn;
        let svg = '';

        if (this.currentTheme === 'nordic-frost') {
            if (state === 'holding') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
                        <circle cx="11.5" cy="12.5" r="2.2" fill="#7dd3fc"/>
                        <circle cx="20.5" cy="12.5" r="2.2" fill="#7dd3fc"/>
                        <ellipse cx="16" cy="20.5" rx="2.5" ry="3.5" fill="#38bdf8"/>
                    </svg>
                `;
            } else if (state === 'won') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/>
                        <rect x="7" y="11" width="18" height="5" rx="2" fill="#38bdf8"/>
                        <rect x="8" y="12" width="16" height="3" rx="1" fill="#e0f2fe" opacity="0.8"/>
                        <path d="M11 21c1.5 2.5 8.5 2.5 10 0" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            } else if (state === 'lost') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#0f172a" stroke="#f43f5e" stroke-width="2"/>
                        <path d="M9.5 10.5l3.5 3.5m0-3.5l-3.5 3.5M19 10.5l3.5 3.5m0-3.5l-3.5 3.5" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
                        <path d="M11 21.5c1.2-2 6.8-2 8 0" fill="none" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            } else {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
                        <circle cx="11.5" cy="13" r="2" fill="#e0f2fe"/>
                        <circle cx="20.5" cy="13" r="2" fill="#e0f2fe"/>
                        <path d="M11 18.5c1.2 2.5 6.8 2.5 8 0" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            }
            faceWrapper.innerHTML = svg;
            this.faceBtn.className = `face-btn state-${state}`;
            return;
        }

        if (this.currentTheme === 'corporate-pro') {
            if (state === 'holding') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>
                        <circle cx="11.5" cy="12.5" r="2.2" fill="#0f172a"/>
                        <circle cx="20.5" cy="12.5" r="2.2" fill="#0f172a"/>
                        <ellipse cx="16" cy="20.5" rx="2.5" ry="3.5" fill="#2563eb"/>
                    </svg>
                `;
            } else if (state === 'won') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#ecfdf5" stroke="#10b981" stroke-width="2"/>
                        <path d="M7 11h7l1 3h2l1-3h7v3c0 2-1.5 3.5-3.5 3.5h-2c-1.5 0-2.5-1-3-2-.5 1-1.5 2-3 2h-2c-2 0-3.5-1.5-3.5-3.5v-3z" fill="#0f172a"/>
                        <line x1="6" y1="12" x2="26" y2="12" stroke="#2563eb" stroke-width="1.5"/>
                        <path d="M11 21c1.5 2.5 8.5 2.5 10 0" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            } else if (state === 'lost') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#fef2f2" stroke="#ef4444" stroke-width="2"/>
                        <path d="M9.5 10.5l3.5 3.5m0-3.5l-3.5 3.5M19 10.5l3.5 3.5m0-3.5l-3.5 3.5" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                        <path d="M11 21.5c1.2-2 6.8-2 8 0" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            } else {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
                        <circle cx="11.5" cy="13" r="1.8" fill="#0f172a"/>
                        <circle cx="20.5" cy="13" r="1.8" fill="#0f172a"/>
                        <path d="M11 18.5c1.2 2.5 6.8 2.5 8 0" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            }
            faceWrapper.innerHTML = svg;
            this.faceBtn.className = `face-btn state-${state}`;
            return;
        }

        if (this.currentTheme === 'retro95') {
            if (state === 'holding') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#FFFF00" stroke="#000000" stroke-width="1.8"/>
                        <circle cx="11" cy="12" r="2.2" fill="#000000"/>
                        <circle cx="21" cy="12" r="2.2" fill="#000000"/>
                        <circle cx="16" cy="20" r="3.2" fill="#000000"/>
                    </svg>
                `;
            } else if (state === 'won') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#FFFF00" stroke="#000000" stroke-width="1.8"/>
                        <rect x="7" y="11" width="8" height="5" rx="1" fill="#000000"/>
                        <rect x="17" y="11" width="8" height="5" rx="1" fill="#000000"/>
                        <line x1="14" y1="13" x2="18" y2="13" stroke="#000000" stroke-width="2"/>
                        <path d="M10 21c1.5 2.5 8.5 2.5 12 0" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            } else if (state === 'lost') {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#FFFF00" stroke="#000000" stroke-width="1.8"/>
                        <line x1="9" y1="10" x2="13" y2="14" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                        <line x1="13" y1="10" x2="9" y2="14" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                        <line x1="19" y1="10" x2="23" y2="14" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                        <line x1="23" y1="10" x2="19" y2="14" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                        <path d="M10 23c1.5 -2.5 8.5 -2.5 12 0" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            } else {
                svg = `
                    <svg class="face-svg" viewBox="0 0 32 32" width="28" height="28">
                        <circle cx="16" cy="16" r="14" fill="#FFFF00" stroke="#000000" stroke-width="1.8"/>
                        <circle cx="11" cy="12" r="2.2" fill="#000000"/>
                        <circle cx="21" cy="12" r="2.2" fill="#000000"/>
                        <path d="M10 19c1.5 3 8.5 3 12 0" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                `;
            }
            faceWrapper.innerHTML = svg;
            this.faceBtn.className = `face-btn state-${state}`;
            return;
        }

        if (state === 'holding') {
            svg = `
                <svg class="face-svg" viewBox="0 0 36 36" width="30" height="30">
                    <circle cx="18" cy="18" r="16" fill="#FFD54F"/>
                    <circle cx="12" cy="13" r="2.3" fill="#37474F"/>
                    <circle cx="24" cy="13" r="2.3" fill="#37474F"/>
                    <ellipse cx="18" cy="22" rx="3.5" ry="4.5" fill="#37474F"/>
                </svg>
            `;
        } else if (state === 'won') {
            svg = `
                <svg class="face-svg" viewBox="0 0 36 36" width="30" height="30">
                    <circle cx="18" cy="18" r="16" fill="#FFD54F"/>
                    <path d="M7 14c0 0 4-3 11-3s11 3 11 3l-1.5 5c-1 3-5 3-7.5 1-1-1-2-1-3 0-2.5 2-6.5 2-7.5-1z" fill="#212121"/>
                    <line x1="5" y1="14" x2="31" y2="14" stroke="#212121" stroke-width="2"/>
                    <path d="M12 24c1.8 2.2 10.2 2.2 12 0" fill="none" stroke="#37474F" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `;
        } else if (state === 'lost') {
            svg = `
                <svg class="face-svg" viewBox="0 0 36 36" width="30" height="30">
                    <circle cx="18" cy="18" r="16" fill="#FF8A80"/>
                    <path d="M10 11l4 4m0-4l-4 4M22 11l4 4m0-4l-4 4" stroke="#37474F" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M12 25c2-3 10-3 12 0" fill="none" stroke="#37474F" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            `;
        } else {
            svg = `
                <svg class="face-svg" viewBox="0 0 36 36" width="30" height="30">
                    <circle cx="18" cy="18" r="16" fill="#FFD54F"/>
                    <circle cx="12" cy="14" r="2.2" fill="#37474F"/>
                    <circle cx="24" cy="14" r="2.2" fill="#37474F"/>
                    <path d="M11 20c1.8 4 12.2 4 14 0" fill="none" stroke="#37474F" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
            `;
        }

        faceWrapper.innerHTML = svg;
        this.faceBtn.className = `face-btn state-${state}`;
    }

    renderTimer(seconds) {
        const formatted = String(Math.min(9999, seconds)).padStart(3, '0');
        this.timerDisplay.textContent = formatted;
    }

    renderMinesCount(count) {
        const formatted = count < 0 ? `-${String(Math.abs(count)).padStart(2, '0')}` : String(count).padStart(3, '0');
        this.minesDisplay.textContent = formatted;
    }

    handleWin(info) {
        this.hideToast();
        window.soundEngine?.playVictory();
        this.boardElement.classList.add('win-celebrate');
        setTimeout(() => this.boardElement.classList.remove('win-celebrate'), 1000);
        const isNewRecord = this.saveStats(true, info.time, info.preset);
        this.updateFace('won');
        this.showEndgamePopup('won', { ...info, isNewRecord });
    }

    handleLoss(explodedCell, cascadeList = []) {
        this.clearLossCascadeTimeouts();
        window.soundEngine?.playExplosion();
        this.boardElement.classList.add('shake-anim');
        setTimeout(() => this.boardElement.classList.remove('shake-anim'), 450);

        this.saveStats(false, 0, this.game.presetKey);
        this.updateFace('lost');

        // 1. La mina clickeada inicial ya detonó de inmediato
        // 2. Animar en cascada radial rápida las demás minas
        const totalCascade = cascadeList.length;
        const maxDuration = Math.min(480, Math.max(160, totalCascade * 16));

        cascadeList.forEach((cell, idx) => {
            const delay = totalCascade > 1 ? Math.round((idx / (totalCascade - 1)) * maxDuration) : 0;
            const timeoutId = setTimeout(() => {
                if (!this.game || this.game.gameState !== 'lost') return;
                if (cell.isMine) {
                    cell.isRevealed = true;
                } else {
                    cell.wrongFlag = true;
                }
                this.renderCell(cell, 0);

                // Micro-acústica percusiva suave para el encadenamiento
                if (idx % 6 === 0) {
                    window.soundEngine?.playDig(1.5);
                }
            }, delay);
            this.lossCascadeTimeouts.push(timeoutId);
        });

        // 3. Tras la cascada completa + delay de contemplación, desplegar la ventana de derrota
        const finalDelay = maxDuration + 380;
        const popupTimeout = setTimeout(() => {
            if (!this.game || this.game.gameState !== 'lost') return;
            this.updateUndoButtonVisibility();
            if (this.game.practiceMode) {
                this.showToast('Has explotado. Puedes pulsar Deshacer', 'warning');
            }
            this.showEndgamePopup('lost', { cell: explodedCell });
        }, finalDelay);
        this.lossCascadeTimeouts.push(popupTimeout);
    }

    updateUndoButtonVisibility() {
        if (!this.undoBtn) return;
        if (this.game.practiceMode && this.game.gameState === 'lost') {
            this.undoBtn.classList.remove('hidden');
        } else {
            this.undoBtn.classList.add('hidden');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            document.exitFullscreen().catch(() => { });
        }
    }

    updateFullscreenButton() {
        const btn = document.getElementById('fullscreen-btn');
        if (!btn) return;
        const isFull = !!document.fullscreenElement;
        btn.innerHTML = isFull ? `
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
        ` : `
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
        `;
        btn.title = isFull ? 'Salir de Pantalla Completa (F)' : 'Pantalla Completa (F)';
    }

    toggleSound() {
        const isMuted = !window.soundEngine.enabled;
        window.soundEngine.setMuted(!isMuted);
        this.updateSoundButton();
    }

    updateSoundButton() {
        const soundBtn = document.getElementById('sound-toggle-btn');
        if (!soundBtn) return;
        const enabled = window.soundEngine.enabled;
        soundBtn.innerHTML = enabled ? `
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
        ` : `
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
        `;
        soundBtn.title = enabled ? 'Silenciar sonido (M)' : 'Activar sonido (M)';
    }

    updateModeButton() {
        localStorage.setItem('ms_control_mode', this.controlMode);
        const iconSpan = this.modeToggleBtn.querySelector('.mode-icon');
        const labelSpan = this.modeToggleBtn.querySelector('.mode-label');

        if (this.controlMode === 'flag') {
            this.modeToggleBtn.classList.add('mode-flag-active');
            if (labelSpan) labelSpan.textContent = 'Bandera';
            if (iconSpan) {
                iconSpan.innerHTML = `
                    <svg class="mode-icon-svg mode-icon-flag" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="3" x2="5" y2="21" stroke-width="2.4"/>
                        <path d="M5 4c4-1.5 7.5 1.5 13.5 0l-1.8 7.5c-6 1.5-9.5-1.5-11.7 0" fill="currentColor"/>
                        <circle cx="5" cy="3" r="1.2" fill="currentColor"/>
                    </svg>
                `;
            }
        } else {
            this.modeToggleBtn.classList.remove('mode-flag-active');
            if (labelSpan) labelSpan.textContent = 'Pala';
            if (iconSpan) {
                iconSpan.innerHTML = `
                    <svg class="mode-icon-svg mode-icon-shovel" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M 2 22 C 2 16, 4 12, 6.5 9.5 L 13.5 16.5 C 12 19, 8 22, 2 22 Z" fill="currentColor" fill-opacity="0.3"/>
                        <line x1="3.5" y1="20.5" x2="8" y2="16" stroke-width="1.3" opacity="0.65"/>
                        <line x1="10" y1="13" x2="15.5" y2="7.5" stroke-width="2.2"/>
                        <path d="M 14 6 L 16.5 3.5 C 17.5 2.5, 19.5 2.5, 20.5 3.5 C 21.5 4.5, 21.5 6.5, 20.5 7.5 L 17 10" stroke-width="1.8"/>
                        <line x1="14" y1="6" x2="17" y2="9" stroke-width="2"/>
                    </svg>
                `;
            }
        }
    }

    setupEventListeners() {
        // Botón carita (Reiniciar)
        this.faceBtn.addEventListener('click', () => {
            window.soundEngine?.playDig(1.2);
            this.startNewGame();
        });

        // Botón modo Pala / Bandera
        this.modeToggleBtn.addEventListener('click', () => {
            this.controlMode = this.controlMode === 'dig' ? 'flag' : 'dig';
            this.updateModeButton();
            window.soundEngine?.playDig(1.4);
        });

        // Botón deshacer (Modo práctica)
        if (this.undoBtn) {
            this.undoBtn.addEventListener('click', () => {
                if (this.game.undoExplosion()) {
                    window.soundEngine?.playUnflag();
                    this.updateUndoButtonVisibility();
                    this.showToast('Movimiento deshecho', 'info');
                }
            });
        }

        // Botón Pantalla Completa
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());

        // Botón Silencio / Sonido
        document.getElementById('sound-toggle-btn')?.addEventListener('click', () => this.toggleSound());

        // Botones de Modales
        document.getElementById('stats-btn')?.addEventListener('click', () => {
            this.renderStatsModal();
            this.openModal(this.statsModal);
        });
        document.getElementById('theme-btn')?.addEventListener('click', () => {
            this.openModal(this.settingsModal);
            const grid = document.getElementById('theme-selector-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openModal(this.settingsModal));
        document.getElementById('help-btn')?.addEventListener('click', () => this.openModal(this.helpModal));

        // Cerrar modales
        document.querySelectorAll('.modal-close, .modal-backdrop').forEach(el => {
            el.addEventListener('click', () => this.closeAllModals());
        });

        // Selector de temas dentro del modal
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                this.applyTheme(opt.dataset.theme);
                window.soundEngine?.playFlag();
            });
        });

        // Controles interactivos del Mini Menú de Fin de Partida
        document.getElementById('endgame-restart-btn')?.addEventListener('click', () => {
            window.soundEngine?.playDig(1.2);
            this.startNewGame();
        });

        document.getElementById('endgame-close-btn')?.addEventListener('click', () => {
            this.minimizeEndgamePopup();
        });

        document.getElementById('endgame-inspect-btn')?.addEventListener('click', () => {
            this.minimizeEndgamePopup();
        });

        document.getElementById('endgame-copy-btn')?.addEventListener('click', () => {
            this.copyEndgameResults();
        });

        document.getElementById('endgame-undo-btn')?.addEventListener('click', () => {
            if (this.game && this.game.undoExplosion()) {
                window.soundEngine?.playUnflag();
                this.updateUndoButtonVisibility();
                this.hideEndgamePopup();
                this.updateFace(this.game.gameState);
                this.showToast('Explosión deshecha. ¡Continúa la partida!', 'info');
            }
        });

        this.reopenEndgameBtn?.addEventListener('click', () => {
            this.restoreEndgamePopup();
        });

        this.setupCustomGameControls();
    }

    setupCustomGameControls() {
        const rowsRange = document.getElementById('custom-rows');
        const rowsNum = document.getElementById('custom-rows-num');
        const colsRange = document.getElementById('custom-cols');
        const colsNum = document.getElementById('custom-cols-num');
        const minesRange = document.getElementById('custom-mines');
        const minesNum = document.getElementById('custom-mines-num');

        const previewBox = document.getElementById('custom-preview-box');
        const totalCellsDisplay = document.getElementById('custom-total-cells');
        const densityPctDisplay = document.getElementById('custom-density-pct');
        const dangerBadge = document.getElementById('custom-danger-badge');
        const dangerDesc = document.getElementById('custom-danger-desc');
        const densityBarFill = document.getElementById('density-bar-fill');
        const startCustomBtn = document.getElementById('start-custom-btn');
        const templateChips = document.querySelectorAll('.template-chip');

        this.updateCustomUI = () => {
            let r = parseInt(rowsNum?.value) || 12;
            let c = parseInt(colsNum?.value) || 16;

            r = Math.max(8, Math.min(36, r));
            c = Math.max(8, Math.min(42, c));

            if (rowsRange) rowsRange.value = r;
            if (rowsNum) rowsNum.value = r;
            if (colsRange) colsRange.value = c;
            if (colsNum) colsNum.value = c;

            const totalCells = r * c;
            const maxMines = Math.floor(totalCells * 0.85);

            if (minesRange) minesRange.max = maxMines;
            if (minesNum) minesNum.max = maxMines;

            let m = parseInt(minesNum?.value) || 20;
            m = Math.max(1, Math.min(maxMines, m));

            if (minesRange) minesRange.value = m;
            if (minesNum) minesNum.value = m;

            const safeCells = totalCells - m;
            const density = (m / totalCells) * 100;
            const densityFormatted = density.toFixed(1);

            if (totalCellsDisplay) {
                totalCellsDisplay.textContent = `${totalCells} (${safeCells} seguras)`;
            }
            if (densityPctDisplay) {
                densityPctDisplay.textContent = `${densityFormatted}%`;
            }

            // Calibrador de Peligro Renovado: 10 Niveles Nuanceados y Juicio Realista
            const dangerTiers = [
                { max: 10.0, lvl: 1, name: 'Muy Suave', cls: 'danger-tier-1', color: '#10b981', desc: 'Aperturas amplias frecuentes y riesgo mínimo de bloqueo.' },
                { max: 13.5, lvl: 2, name: 'Relajado', cls: 'danger-tier-2', color: '#22c55e', desc: 'Similar a Modo Fácil; ideal para calentar o partidas ágiles.' },
                { max: 17.0, lvl: 3, name: 'Equilibrado', cls: 'danger-tier-3', color: '#06b6d4', desc: 'Dificultad tradicional Intermedia con deducción lógica limpia.' },
                { max: 20.5, lvl: 4, name: 'Moderado', cls: 'danger-tier-4', color: '#3b82f6', desc: 'Ritmo sostenido; requiere encadenar patrones de 1 y 2.' },
                { max: 23.5, lvl: 5, name: 'Desafiante', cls: 'danger-tier-5', color: '#eab308', desc: 'Nivel Difícil tradicional; aparecen situaciones de conteo riguroso.' },
                { max: 27.0, lvl: 6, name: 'Intenso', cls: 'danger-tier-6', color: '#f97316', desc: 'Estilo Extra Difícil e Imposible; espacios estrechos y alta tensión.' },
                { max: 31.5, lvl: 7, name: 'Alta Tensión', cls: 'danger-tier-7', color: '#fb7185', desc: 'Casi una mina por cada 3 casillas; decisiones al milímetro.' },
                { max: 36.5, lvl: 8, name: 'Extremo', cls: 'danger-tier-8', color: '#ef4444', desc: 'Densidad crítica; deducciones complejas y frecuentes encrucijadas.' },
                { max: 43.0, lvl: 9, name: 'Pesadilla', cls: 'danger-tier-9', color: '#dc2626', desc: 'Campo minado implacable; se requieren nervios de acero y fortuna.' },
                { max: Infinity, lvl: 10, name: 'Caos Absoluto', cls: 'danger-tier-10', color: '#a855f7', desc: 'Saturación explosiva casi infranqueable. ¡Solo para temerarios!' }
            ];

            const tier = dangerTiers.find(t => density <= t.max) || dangerTiers[dangerTiers.length - 1];

            if (dangerBadge) {
                dangerBadge.className = `custom-danger-badge ${tier.cls}`;
                dangerBadge.textContent = `Nivel ${tier.lvl}/10 · ${tier.name}`;
            }

            if (dangerDesc) {
                dangerDesc.textContent = tier.desc;
                dangerDesc.style.borderLeftColor = tier.color;
            }

            if (densityBarFill) {
                const fillPct = Math.min(100, Math.max(4, (density / 45) * 100));
                densityBarFill.style.width = `${fillPct}%`;
                densityBarFill.style.backgroundColor = tier.color;
            }

            // Previsualización Proporcional del Tablero
            if (previewBox) {
                const maxBoxW = 95;
                const maxBoxH = 60;
                const ratio = c / r;

                let w, h;
                if (ratio >= maxBoxW / maxBoxH) {
                    w = maxBoxW;
                    h = Math.max(18, Math.round(maxBoxW / ratio));
                } else {
                    h = maxBoxH;
                    w = Math.max(18, Math.round(maxBoxH * ratio));
                }

                previewBox.style.width = `${w}px`;
                previewBox.style.height = `${h}px`;
            }

            if (rowsRange) this.updateSliderProgress(rowsRange);
            if (colsRange) this.updateSliderProgress(colsRange);
            if (minesRange) this.updateSliderProgress(minesRange);
        };

        rowsRange?.addEventListener('input', (e) => {
            if (rowsNum) rowsNum.value = e.target.value;
            this.updateCustomUI();
        });
        rowsNum?.addEventListener('input', (e) => {
            if (rowsRange) rowsRange.value = e.target.value;
            this.updateCustomUI();
        });

        colsRange?.addEventListener('input', (e) => {
            if (colsNum) colsNum.value = e.target.value;
            this.updateCustomUI();
        });
        colsNum?.addEventListener('input', (e) => {
            if (colsRange) colsRange.value = e.target.value;
            this.updateCustomUI();
        });

        minesRange?.addEventListener('input', (e) => {
            if (minesNum) minesNum.value = e.target.value;
            this.updateCustomUI();
        });
        minesNum?.addEventListener('input', (e) => {
            if (minesRange) minesRange.value = e.target.value;
            this.updateCustomUI();
        });

        templateChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const r = parseInt(chip.dataset.rows);
                const c = parseInt(chip.dataset.cols);
                const m = parseInt(chip.dataset.mines);

                if (rowsNum) rowsNum.value = r;
                if (colsNum) colsNum.value = c;
                if (minesNum) minesNum.value = m;

                this.updateCustomUI();
                window.soundEngine?.playDig(1.5);
            });
        });

        startCustomBtn?.addEventListener('click', () => {
            const r = parseInt(rowsNum?.value) || 12;
            const c = parseInt(colsNum?.value) || 16;
            const m = parseInt(minesNum?.value) || 20;

            this.customConfig = { rows: r, cols: c, mines: m };
            localStorage.setItem('ms_custom_config', JSON.stringify(this.customConfig));

            this.presetTabs.forEach(t => t.classList.toggle('active', t.dataset.preset === 'custom'));
            this.currentPreset = 'custom';
            this.closeAllModals();
            this.startNewGame('custom', this.customConfig);
        });

        if (this.customConfig) {
            if (rowsNum) rowsNum.value = this.customConfig.rows || 12;
            if (colsNum) colsNum.value = this.customConfig.cols || 16;
            if (minesNum) minesNum.value = this.customConfig.mines || 24;
        }
        this.updateCustomUI();
    }

    setupShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Manejo de tecla Tab para configuraciones
            if (e.key === 'Tab') {
                e.preventDefault();
                if (this.settingsModal.classList.contains('active')) {
                    this.closeAllModals();
                } else {
                    this.openModal(this.settingsModal);
                }
                return;
            }

            // Si hay un modal abierto y presiona Escape
            if (document.querySelector('.modal.active')) {
                if (e.key === 'Escape') this.closeAllModals();
                return;
            }

            // Ignorar si el usuario está escribiendo en un input
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                return;
            }

            const keyLower = e.key.toLowerCase();

            // Hotkey F: Alternar Pantalla Completa
            if (keyLower === 'f') {
                e.preventDefault();
                this.toggleFullscreen();
                return;
            }

            // Hotkey M: Alternar Sonido
            if (keyLower === 'm') {
                e.preventDefault();
                this.toggleSound();
                return;
            }

            // Hotkey T: Selector Rápido de Temas Visuales
            if (keyLower === 't') {
                e.preventDefault();
                if (this.settingsModal.classList.contains('active')) {
                    this.closeAllModals();
                } else {
                    this.openModal(this.settingsModal);
                    const grid = document.getElementById('theme-selector-grid');
                    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
            }

            // Hotkey Espacio: Alternar Pala / Bandera o Reiniciar si la partida terminó
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.game && (this.game.gameState === 'won' || this.game.gameState === 'lost' || this.isEndgamePopupVisible())) {
                    this.startNewGame();
                    return;
                }
                this.controlMode = this.controlMode === 'dig' ? 'flag' : 'dig';
                this.updateModeButton();
                window.soundEngine?.playDig(1.3);
                return;
            }

            // Hotkey R: Reiniciar partida
            if (keyLower === 'r') {
                e.preventDefault();
                this.startNewGame();
                return;
            }

            // Ctrl+Z: Deshacer en modo práctica
            if (keyLower === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.undoBtn?.click();
                return;
            }

            if (e.key === 'Escape') {
                if (this.isEndgamePopupVisible()) {
                    this.minimizeEndgamePopup();
                    return;
                }
                this.closeAllModals();
            }
        });
    }

    openModal(modal) {
        if (!modal) return;
        this.closeAllModals();
        modal.classList.add('active');
        if (modal === this.customModal && this.updateCustomUI) {
            this.updateCustomUI();
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    loadSettings() {
        const practiceCheck = document.getElementById('setting-practice-mode');
        if (practiceCheck) {
            practiceCheck.checked = localStorage.getItem('ms_practice_mode') === 'true';
            practiceCheck.addEventListener('change', (e) => {
                localStorage.setItem('ms_practice_mode', e.target.checked ? 'true' : 'false');
                if (this.game) this.game.practiceMode = e.target.checked;
                this.updateUndoButtonVisibility();
            });
        }

        const questionCheck = document.getElementById('setting-questions');
        if (questionCheck) {
            questionCheck.checked = localStorage.getItem('ms_use_questions') === 'true';
            questionCheck.addEventListener('change', (e) => {
                localStorage.setItem('ms_use_questions', e.target.checked ? 'true' : 'false');
                if (this.game) this.game.useQuestionMarks = e.target.checked;
            });
        }

        const volumeSlider = document.getElementById('setting-volume');
        const volumeVal = document.getElementById('volume-val');
        if (volumeSlider) {
            const savedVol = localStorage.getItem('minesweeper_deluxe_volume');
            const initVal = savedVol !== null ? Math.round(parseFloat(savedVol) * 100) : Math.round((window.soundEngine?.volume || 0.6) * 100);
            volumeSlider.value = initVal;
            if (volumeVal) volumeVal.textContent = initVal === 0 ? 'Silencio' : `${initVal}%`;
            this.updateSliderProgress(volumeSlider);

            volumeSlider.addEventListener('input', (e) => {
                const intVal = parseInt(e.target.value);
                const v = intVal / 100;
                window.soundEngine?.setVolume(v);
                if (volumeVal) {
                    volumeVal.textContent = intVal === 0 ? 'Silencio' : `${intVal}%`;
                }
                this.updateSliderProgress(volumeSlider);
                this.updateSoundButton();
            });
        }
    }

    updateSliderProgress(slider) {
        if (!slider) return;
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const pct = Math.max(0, Math.min(100, ((val - min) / Math.max(1, max - min)) * 100));
        slider.style.setProperty('--slider-fill-pct', `${pct}%`);
    }

    saveStats(won, time, preset) {
        try {
            const stats = JSON.parse(localStorage.getItem('ms_stats') || '{}');
            const pStats = stats[preset] || {
                played: 0,
                won: 0,
                bestTime: null,
                currentStreak: 0,
                maxStreak: 0,
                totalPlayTime: 0,
                totalClears: 0,
                lastPlayed: null
            };
            let isNewRecord = false;

            pStats.played = (pStats.played || 0) + 1;
            pStats.totalPlayTime = (pStats.totalPlayTime || 0) + (time || 0);
            if (this.game) {
                pStats.totalClears = (pStats.totalClears || 0) + (this.game.revealedCount || 0);
            }
            pStats.lastPlayed = new Date().toISOString();

            if (won) {
                pStats.won = (pStats.won || 0) + 1;
                pStats.currentStreak = (pStats.currentStreak || 0) + 1;
                if (pStats.currentStreak > (pStats.maxStreak || 0)) {
                    pStats.maxStreak = pStats.currentStreak;
                }
                if (pStats.bestTime === null || time < pStats.bestTime) {
                    pStats.bestTime = time;
                    isNewRecord = true;
                }
            } else {
                pStats.currentStreak = 0;
            }

            stats[preset] = pStats;
            localStorage.setItem('ms_stats', JSON.stringify(stats));

            // Guardar Métricas Globales Acumuladas
            const globalStats = JSON.parse(localStorage.getItem('ms_global_stats') || '{}');
            globalStats.totalGames = (globalStats.totalGames || 0) + 1;
            if (won) globalStats.totalWins = (globalStats.totalWins || 0) + 1;
            globalStats.totalSeconds = (globalStats.totalSeconds || 0) + (time || 0);
            if (this.game) {
                globalStats.cellsCleared = (globalStats.cellsCleared || 0) + (this.game.revealedCount || 0);
            }
            if (!globalStats.startDate) {
                globalStats.startDate = new Date().toISOString();
            }
            globalStats.lastPlayed = new Date().toISOString();
            localStorage.setItem('ms_global_stats', JSON.stringify(globalStats));

            return isNewRecord;
        } catch (err) {
            console.warn('Error guardando estadísticas:', err);
            return false;
        }
    }

    getPresetName(key) {
        const names = {
            'easy': 'Fácil',
            'medium': 'Intermedio',
            'hard': 'Difícil',
            'expert': 'Extra Difícil',
            'legendary': 'Legendario',
            'impossible': 'Imposible',
            'custom': 'Personalizado'
        };
        return names[key] || 'Partida';
    }

    showEndgamePopup(type, details = {}) {
        if (!this.endgamePopup || !this.game) return;

        const isWon = type === 'won';
        const presetName = this.getPresetName(this.game.presetKey);
        const totalCells = this.game.rows * this.game.cols;
        const targetSafe = totalCells - this.game.totalMines;
        const clearedCount = this.game.revealedCount;
        const clearedPct = Math.min(100, Math.round((clearedCount / Math.max(1, targetSafe)) * 100));
        const timeSecs = details.time !== undefined ? details.time : this.game.elapsedTime;
        const rate = (clearedCount / Math.max(1, timeSecs)).toFixed(1);

        let correctFlags = 0;
        let wrongFlags = 0;
        for (let r = 0; r < this.game.rows; r++) {
            for (let c = 0; c < this.game.cols; c++) {
                const cell = this.game.board[r][c];
                if (cell.isFlagged) {
                    if (cell.isMine) correctFlags++;
                    else wrongFlags++;
                }
            }
        }
        const flagsCount = this.game.flagsCount;
        const accuracy = flagsCount > 0 ? Math.round((correctFlags / flagsCount) * 100) : 100;

        // Tipo y Preset Pills
        const typePill = document.getElementById('endgame-type-pill');
        const presetPill = document.getElementById('endgame-preset-pill');
        if (typePill) {
            typePill.className = `endgame-type-pill type-${type}`;
            typePill.textContent = isWon ? 'Victoria' : 'Derrota';
        }
        if (presetPill) {
            presetPill.textContent = `${presetName} (${this.game.cols}×${this.game.rows})`;
        }

        // Hero SVG Icon
        const heroIcon = document.getElementById('endgame-hero-icon');
        if (heroIcon) {
            if (isWon) {
                heroIcon.innerHTML = `
                    <svg class="hero-result-svg victory-svg" viewBox="0 0 48 48" width="56" height="56" fill="none">
                        <defs>
                            <linearGradient id="goldGradHero" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stop-color="#FDE047"/>
                                <stop offset="50%" stop-color="#EAB308"/>
                                <stop offset="100%" stop-color="#CA8A04"/>
                            </linearGradient>
                        </defs>
                        <path d="M14 8h20v14c0 6-4.5 10-10 10s-10-4-10-10V8z" fill="url(#goldGradHero)" stroke="#B45309" stroke-width="2"/>
                        <path d="M14 12H8c0 5 3 9 6 9v-3c-2 0-4-3-4-6h4v0z" fill="url(#goldGradHero)" stroke="#B45309" stroke-width="1.8"/>
                        <path d="M34 12h6c0 5-3 9-6 9v-3c2 0 4-3 4-6h-4v0z" fill="url(#goldGradHero)" stroke="#B45309" stroke-width="1.8"/>
                        <rect x="22" y="32" width="4" height="6" fill="url(#goldGradHero)" stroke="#B45309" stroke-width="1.8"/>
                        <rect x="16" y="38" width="16" height="5" rx="2" fill="#78350F" stroke="#B45309" stroke-width="1.8"/>
                        <polygon points="24,14 25.5,18 29.5,18 26.2,20.5 27.5,24.5 24,22 20.5,24.5 21.8,20.5 18.5,18 22.5,18" fill="#FFFBEB"/>
                    </svg>
                `;
            } else {
                heroIcon.innerHTML = `
                    <svg class="hero-result-svg defeat-svg" viewBox="0 0 48 48" width="56" height="56" fill="none">
                        <defs>
                            <radialGradient id="blastGradHero" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="#FEF08A"/>
                                <stop offset="40%" stop-color="#F97316"/>
                                <stop offset="90%" stop-color="#DC2626"/>
                            </radialGradient>
                        </defs>
                        <polygon points="24,2 28,15 41,8 34,21 47,24 34,27 41,40 28,33 24,46 20,33 7,40 14,27 1,24 14,21 7,8 20,15" fill="url(#blastGradHero)" opacity="0.95"/>
                        <circle cx="24" cy="24" r="11" fill="#1F2937" stroke="#E11D48" stroke-width="2"/>
                        <path d="M21 16l3 5-2 4 4 4" stroke="#FBBF24" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="24" cy="24" r="3" fill="#EF4444"/>
                    </svg>
                `;
            }
        }

        // Título del Resultado
        const titleEl = document.getElementById('endgame-title');
        if (titleEl) {
            titleEl.className = `endgame-title title-${type}`;
            titleEl.textContent = isWon ? '¡Victoria!' : 'Has explotado...';
        }

        // Valores de Estadísticas
        const statTime = document.getElementById('endgame-stat-time');
        const recordTag = document.getElementById('endgame-record-tag');
        if (statTime) statTime.textContent = `${String(timeSecs).padStart(3, '0')}s`;
        if (recordTag) {
            recordTag.classList.toggle('hidden', !details.isNewRecord);
        }

        const statCleared = document.getElementById('endgame-stat-cleared');
        const statClearedCount = document.getElementById('endgame-stat-cleared-count');
        if (statCleared) statCleared.textContent = `${clearedPct}%`;
        if (statClearedCount) statClearedCount.textContent = `${clearedCount}/${targetSafe}`;

        const statFlags = document.getElementById('endgame-stat-flags');
        const statAccuracy = document.getElementById('endgame-stat-accuracy');
        if (statFlags) statFlags.textContent = `${flagsCount} / ${this.game.totalMines}`;
        if (statAccuracy) statAccuracy.textContent = isWon ? '100% acierto' : `${accuracy}% acierto`;

        const statRate = document.getElementById('endgame-stat-rate');
        if (statRate) statRate.textContent = `${rate}/s`;

        // Barra de Progreso del Campo (Visible tanto en Victoria como en Derrota)
        const progressWrap = document.getElementById('endgame-progress-wrap');
        const progressPct = document.getElementById('endgame-progress-pct');
        const progressFill = document.getElementById('endgame-progress-fill');
        if (progressWrap) {
            progressWrap.classList.remove('hidden');
            if (progressPct) {
                if (isWon) {
                    progressPct.textContent = `100% (${targetSafe}/${targetSafe} - ¡Completado!)`;
                } else {
                    progressPct.textContent = `${clearedPct}% (${clearedCount} de ${targetSafe} seguras)`;
                }
            }
            if (progressFill) {
                progressFill.className = `endgame-progress-fill ${isWon ? 'fill-won' : 'fill-lost'}`;
                progressFill.style.width = '0%';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        progressFill.style.width = `${isWon ? 100 : clearedPct}%`;
                    });
                });
            }
        }

        // Botón Deshacer en modo práctica
        const undoActionBtn = document.getElementById('endgame-undo-btn');
        if (undoActionBtn) {
            undoActionBtn.classList.toggle('hidden', !(!isWon && this.game.practiceMode));
        }

        // Mostrar popup y ocultar botón de reabrir
        this.endgamePopup.classList.remove('hidden');
        if (this.reopenEndgameBtn) {
            this.reopenEndgameBtn.classList.add('hidden');
        }
    }

    minimizeEndgamePopup() {
        if (this.endgamePopup) {
            this.endgamePopup.classList.add('hidden');
        }
        if (this.reopenEndgameBtn && this.game && (this.game.gameState === 'won' || this.game.gameState === 'lost')) {
            this.reopenEndgameBtn.classList.remove('hidden');
        }
    }

    restoreEndgamePopup() {
        if (this.endgamePopup) {
            this.endgamePopup.classList.remove('hidden');
        }
        if (this.reopenEndgameBtn) {
            this.reopenEndgameBtn.classList.add('hidden');
        }
    }

    hideEndgamePopup() {
        if (this.endgamePopup) {
            this.endgamePopup.classList.add('hidden');
        }
        if (this.reopenEndgameBtn) {
            this.reopenEndgameBtn.classList.add('hidden');
        }
    }

    isEndgamePopupVisible() {
        return this.endgamePopup && !this.endgamePopup.classList.contains('hidden');
    }

    copyEndgameResults() {
        if (!this.game) return;
        const isWon = this.game.gameState === 'won';
        const presetName = this.getPresetName(this.game.presetKey);
        const time = `${this.game.elapsedTime}s`;
        const total = this.game.rows * this.game.cols;
        const targetSafe = total - this.game.totalMines;
        const clearedPct = Math.round((this.game.revealedCount / Math.max(1, targetSafe)) * 100);

        let summary = `[Buscaminas Deluxe] Resultado:\n`;
        summary += `• Estado: ${isWon ? 'Victoria' : 'Has explotado...'}\n`;
        summary += `• Nivel: ${presetName} (${this.game.cols}x${this.game.rows})\n`;
        summary += `• Tiempo: ${time}\n`;
        summary += `• Campo despejado: ${clearedPct}% (${this.game.revealedCount}/${targetSafe})\n`;
        summary += `• Minas totales: ${this.game.totalMines}\n`;

        navigator.clipboard.writeText(summary).then(() => {
            const copyText = document.getElementById('endgame-copy-text');
            if (copyText) {
                const prev = copyText.textContent;
                copyText.textContent = '¡Copiado!';
                setTimeout(() => { copyText.textContent = prev; }, 2000);
            }
            this.showToast('Resumen copiado al portapapeles', 'success');
        }).catch(() => {
            this.showToast('No se pudo copiar al portapapeles', 'warning');
        });
    }

    renderStatsModal() {
        const stats = JSON.parse(localStorage.getItem('ms_stats') || '{}');
        const globalStats = JSON.parse(localStorage.getItem('ms_global_stats') || '{}');
        const container = document.getElementById('stats-content');
        if (!container) return;

        const presets = [
            { id: 'easy', name: 'Fácil' },
            { id: 'medium', name: 'Intermedio' },
            { id: 'hard', name: 'Difícil' },
            { id: 'expert', name: 'Extra Difícil' },
            { id: 'legendary', name: 'Legendario' },
            { id: 'impossible', name: 'Imposible' },
            { id: 'custom', name: 'Personalizado' }
        ];

        // Totales globales
        let totalPlayed = globalStats.totalGames || 0;
        let totalWon = globalStats.totalWins || 0;
        let totalSecs = globalStats.totalSeconds || 0;
        let totalClears = globalStats.cellsCleared || 0;

        // Si no existen globales pero hay por preset, acumularlos
        if (!totalPlayed) {
            presets.forEach(p => {
                const d = stats[p.id];
                if (d) {
                    totalPlayed += (d.played || 0);
                    totalWon += (d.won || 0);
                    totalSecs += (d.totalPlayTime || 0);
                    totalClears += (d.totalClears || 0);
                }
            });
        }

        const globalWinRate = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;
        const formatTime = (secs) => {
            if (!secs || secs < 0) return '0s';
            if (secs < 60) return `${secs}s`;
            const mins = Math.floor(secs / 60);
            const remainSecs = secs % 60;
            if (mins < 60) return `${mins}m ${remainSecs}s`;
            const hrs = Math.floor(mins / 60);
            return `${hrs}h ${mins % 60}m`;
        };

        let html = `
            <div class="stats-global-summary">
                <div class="global-stat-card">
                    <span class="global-stat-num">${totalPlayed}</span>
                    <span class="global-stat-txt">Partidas Totales</span>
                </div>
                <div class="global-stat-card">
                    <span class="global-stat-num highlight-stat">${totalWon} <small style="font-size:0.75rem; color:#4ade80;">(${globalWinRate}%)</small></span>
                    <span class="global-stat-txt">Victorias Globales</span>
                </div>
                <div class="global-stat-card">
                    <span class="global-stat-num">${formatTime(totalSecs)}</span>
                    <span class="global-stat-txt">Tiempo Invertido</span>
                </div>
                <div class="global-stat-card">
                    <span class="global-stat-num">${totalClears.toLocaleString()}</span>
                    <span class="global-stat-txt">Casillas Despejadas</span>
                </div>
            </div>
            <div class="stats-grid">
        `;

        presets.forEach(p => {
            const data = stats[p.id] || { played: 0, won: 0, bestTime: null, maxStreak: 0, totalPlayTime: 0 };
            const winRate = data.played > 0 ? Math.round((data.won / data.played) * 100) : 0;
            const bestTimeText = data.bestTime !== null ? `${data.bestTime}s` : '--';
            const levelTimeText = formatTime(data.totalPlayTime || 0);

            html += `
                <div class="stats-card">
                    <h4>${p.name}</h4>
                    <div class="stat-row"><span>Jugadas:</span><strong>${data.played}</strong></div>
                    <div class="stat-row"><span>Victorias:</span><strong>${data.won} (${winRate}%)</strong></div>
                    <div class="stat-row"><span>Mejor Tiempo:</span><strong class="highlight-stat">${bestTimeText}</strong></div>
                    <div class="stat-row"><span>Racha Máxima:</span><strong>${data.maxStreak || 0}</strong></div>
                    <div class="stat-row"><span>Tiempo Jugado:</span><strong>${levelTimeText}</strong></div>
                </div>
            `;
        });
        html += '</div>';

        html += `
            <div class="stats-actions-bar">
                <button type="button" id="copy-stats-btn" class="btn-stats-secondary">Copiar Resumen</button>
                <button type="button" id="export-stats-btn" class="btn-stats-secondary">Exportar Backup</button>
                <button type="button" id="import-stats-btn" class="btn-stats-secondary">Importar Backup</button>
                <input type="file" id="import-stats-file" accept=".json" style="display:none;">
                <button type="button" id="reset-stats-btn" class="btn-stats-danger">Restablecer Récords</button>
            </div>
        `;

        container.innerHTML = html;

        // Listeners de botones de estadísticas
        document.getElementById('copy-stats-btn')?.addEventListener('click', () => {
            let text = `[Buscaminas Deluxe] Resumen de Récords:\n`;
            text += `• Partidas Totales: ${totalPlayed} | Victorias: ${totalWon} (${globalWinRate}%)\n`;
            text += `• Tiempo Jugado: ${formatTime(totalSecs)} | Casillas Despejadas: ${totalClears}\n\n`;
            presets.forEach(p => {
                const d = stats[p.id] || { played: 0, won: 0, bestTime: null };
                const rate = d.played > 0 ? Math.round((d.won / d.played) * 100) : 0;
                const best = d.bestTime !== null ? `${d.bestTime}s` : '--';
                text += `• ${p.name}: ${d.won}/${d.played} victorias (${rate}%) | Récord: ${best}\n`;
            });

            navigator.clipboard.writeText(text).then(() => {
                this.showToast('Estadísticas copiadas al portapapeles', 'success');
            }).catch(() => {
                this.showToast('No se pudo copiar al portapapeles', 'warning');
            });
        });

        // Exportar estadísticas a JSON
        document.getElementById('export-stats-btn')?.addEventListener('click', () => {
            try {
                const exportData = {
                    appName: 'Buscaminas Deluxe',
                    version: '1.2.0',
                    exportDate: new Date().toISOString(),
                    stats: JSON.parse(localStorage.getItem('ms_stats') || '{}'),
                    globalStats: JSON.parse(localStorage.getItem('ms_global_stats') || '{}'),
                    theme: localStorage.getItem('ms_theme') || 'google-garden',
                    customConfig: this.customConfig
                };
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `buscaminas_deluxe_backup_${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showToast('Copia de seguridad descargada', 'success');
            } catch (err) {
                this.showToast('Error al exportar datos', 'warning');
            }
        });

        // Importar estadísticas desde JSON
        const fileInput = document.getElementById('import-stats-file');
        document.getElementById('import-stats-btn')?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (parsed && typeof parsed === 'object') {
                        if (parsed.stats) localStorage.setItem('ms_stats', JSON.stringify(parsed.stats));
                        if (parsed.globalStats) localStorage.setItem('ms_global_stats', JSON.stringify(parsed.globalStats));
                        if (parsed.theme) {
                            this.applyTheme(parsed.theme);
                        }
                        if (parsed.customConfig) {
                            this.customConfig = parsed.customConfig;
                            localStorage.setItem('ms_custom_config', JSON.stringify(parsed.customConfig));
                        }
                        this.showToast('Copia de seguridad restaurada con éxito', 'success');
                        this.renderStatsModal();
                    } else {
                        throw new Error('Formato no válido');
                    }
                } catch (err) {
                    this.showToast('Archivo JSON inválido o dañado', 'warning');
                }
            };
            reader.readAsText(file);
        });

        document.getElementById('reset-stats-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            if (!btn.dataset.confirm) {
                btn.dataset.confirm = 'true';
                btn.textContent = '¿Confirmar Borrado?';
                setTimeout(() => {
                    btn.dataset.confirm = '';
                    btn.textContent = 'Restablecer Récords';
                }, 3500);
            } else {
                localStorage.removeItem('ms_stats');
                localStorage.removeItem('ms_global_stats');
                this.showToast('Récords y estadísticas restablecidos', 'info');
                this.renderStatsModal();
            }
        });
    }

    showToast(message, type = 'info') {
        let toast = document.getElementById('game-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'game-toast';
            document.body.appendChild(toast);
        }

        toast.className = `game-toast toast-${type} show`;
        toast.textContent = message;

        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    hideToast() {
        const toast = document.getElementById('game-toast');
        if (toast) {
            toast.classList.remove('show');
        }
        clearTimeout(this.toastTimer);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.minesweeperApp = new MinesweeperUI();

    // Registro de Service Worker para PWA y soporte offline
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch((err) => {
                console.log('Service Worker no activo:', err);
            });
        });
    }
});
