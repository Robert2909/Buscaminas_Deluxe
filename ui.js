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
            this.customConfig.rows = Math.min(64, Math.max(8, parseInt(this.customConfig.rows) || 12));
            this.customConfig.cols = Math.min(64, Math.max(8, parseInt(this.customConfig.cols) || 16));
            const maxMines = Math.floor(this.customConfig.rows * this.customConfig.cols * 0.85);
            this.customConfig.mines = Math.min(maxMines, Math.max(1, parseInt(this.customConfig.mines) || 24));
        } catch (e) {
            this.customConfig = { rows: 12, cols: 16, mines: 24 };
        }

        // Carga segura de modo de control
        const savedMode = localStorage.getItem('ms_control_mode');
        this.controlMode = (savedMode === 'flag') ? 'flag' : 'dig';

        // Carga segura de Modo No-Guess global (por defecto activado)
        const savedNG = localStorage.getItem('ms_no_guess');
        this.noGuessMode = savedNG === null ? true : savedNG === 'true';

        this.hoveredCell = null;
        this.holdState = {
            active: false,
            charged: false,
            r: null,
            c: null,
            cellEl: null,
            startX: 0,
            startY: 0,
            startTime: 0,
            timerId: null,
            animId: null,
            suppressClick: false
        };
        this.lossCascadeTimeouts = [];

        // Zoom y Paneo Nativo Robusto Vectorial
        this.scale = 1.0;
        this.baseCellSize = 36;
        this.panX = 0;
        this.panY = 0;
        this.isMiddlePanning = false;
        this.isSpacePanning = false;
        this.spaceKeyPressed = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.startPanX = 0;
        this.startPanY = 0;
        this.activeTouchPointers = new Map();
        this.initialPinchDistance = 0;
        this.initialPinchScale = 1.0;
        this.isTouchPanning = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartPanX = 0;
        this.touchStartPanY = 0;
        this.deviceProfile = null;

        // Referencias a elementos DOM
        this.boardContainer = document.getElementById('board-container');
        this.boardViewport = document.getElementById('board-viewport');
        this.boardElement = document.getElementById('game-board');
        this.boardZoomWidget = document.getElementById('board-zoom-widget');
        this.faceBtn = document.getElementById('face-btn');
        this.timerDisplay = document.getElementById('timer-display');
        this.minesDisplay = document.getElementById('mines-display');
        this.modeToggleBtn = document.getElementById('mode-toggle-btn');
        this.presetTabs = document.querySelectorAll('.preset-tab');
        this.undoBtn = document.getElementById('undo-btn');
        this.endgamePopup = document.getElementById('endgame-popup');
        this.reopenEndgameBtn = document.getElementById('reopen-endgame-btn');
        this.ngBadge = document.getElementById('hud-badge-ng');

        // Elementos de Inspección de Derrota (Explosion UX)
        this.lossInspectorHud = document.getElementById('loss-inspector-hud');
        this.lossHudCoords = document.getElementById('loss-hud-coords');
        this.lossHudAccuracy = document.getElementById('loss-hud-accuracy');
        this.lossFocusMineBtn = document.getElementById('loss-focus-mine-btn');
        this.lossShowSummaryBtn = document.getElementById('loss-show-summary-btn');
        this.lossRetryBtn = document.getElementById('loss-retry-btn');
        this.lastFatalCell = null;

        // Modales
        this.settingsModal = document.getElementById('settings-modal');
        this.statsModal = document.getElementById('stats-modal');
        this.customModal = document.getElementById('custom-modal');
        this.helpModal = document.getElementById('help-modal');

        // Elementos de Guía y Estado No-Guess en Modal Personalizado
        this.customNgGuidanceCard = document.getElementById('custom-ng-guidance-card');
        this.customNgStatusBadge = document.getElementById('custom-ng-status-badge');
        this.customNgToggleBtn = document.getElementById('custom-ng-toggle-btn');
        this.customNgToggleText = document.getElementById('custom-ng-toggle-text');
        this.customNgAdviceBadge = document.getElementById('custom-ng-advice-badge');
        this.customNgAdviceText = document.getElementById('custom-ng-advice-text');
        this.customNgRangeHint = document.getElementById('custom-ng-range-hint');

        // Elementos del Badge HUD No-Guess
        this.ngBadgeIconWrap = document.getElementById('hud-badge-icon-wrap');
        this.ngBadgeText = document.getElementById('hud-badge-text');
        this.ngBadgeStatusIcon = document.getElementById('hud-badge-status-icon');

        // Modal de Fallback No-Guess (Desactivación Involuntaria)
        this.ngFallbackModal = document.getElementById('ng-fallback-modal');
        this.ngFallbackDims = document.getElementById('ng-fallback-dims');
        this.ngFallbackDensity = document.getElementById('ng-fallback-density');
        this.ngFallbackReason = document.getElementById('ng-fallback-reason');
        this.ngFallbackContinueBtn = document.getElementById('ng-fallback-continue-btn');
        this.ngFallbackRetryBtn = document.getElementById('ng-fallback-retry-btn');
        this.ngFallbackCustomizeBtn = document.getElementById('ng-fallback-customize-btn');

        this.init();
    }

    init() {
        this.initDeviceProfile();
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.setupPresetTabs();
        this.setupShortcuts();
        this.setupResizeObserver();
        this.setupHoldInteraction();
        this.setupBoardEventDelegation();
        this.setupZoomAndPan();
        this.loadSettings();
        this.updateSoundButton();
        this.updateModeButton();
        this.updateFullscreenButton();
        this.updateNoGuessBadge();
        this.startNewGame(this.currentPreset);
    }

    initDeviceProfile() {
        this.updateDeviceProfile();

        window.addEventListener('resize', () => {
            this.updateDeviceProfile();
        }, { passive: true });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateDeviceProfile();
                this.updateBoardDimensions();
                this.centerBoard(true);
            }, 120);
        });

        if (window.matchMedia) {
            window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
                setTimeout(() => {
                    this.updateDeviceProfile();
                    this.updateBoardDimensions();
                    this.centerBoard(true);
                }, 100);
            });
        }
    }

    updateDeviceProfile() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const isMobile = w <= 768 || (isTouch && w <= 1024);
        const isSmallMobile = w <= 430;
        const isTinyMobile = w <= 360;
        const isLandscape = w > h && h <= 540;

        this.deviceProfile = {
            width: w,
            height: h,
            isTouch,
            isMobile,
            isSmallMobile,
            isTinyMobile,
            isLandscape
        };

        const doc = document.documentElement;
        if (doc) {
            doc.style.setProperty('--app-height', `${h}px`);
        }

        const body = document.body;
        if (body) {
            body.classList.toggle('is-mobile', isMobile);
            body.classList.toggle('is-touch-device', isTouch);
            body.classList.toggle('is-small-mobile', isSmallMobile);
            body.classList.toggle('is-tiny-mobile', isTinyMobile);
            body.classList.toggle('is-mobile-landscape', isLandscape);
        }
    }

    applyTheme(theme) {
        const VALID_THEMES = ['google-garden', 'corporate-pro', 'vscode', 'retro95', 'cyberpunk-neon', 'dark-glass', 'sunset-desert', 'nordic-frost'];
        if (!VALID_THEMES.includes(theme)) {
            theme = 'google-garden';
        }
        this.currentTheme = theme;
        VALID_THEMES.forEach(t => document.body.classList.remove(`theme-${t}`));
        document.body.classList.add(`theme-${theme}`);
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
        // Sincronizar pestana visual activa con el preset guardado en memoria local
        this.presetTabs.forEach(t => {
            const isActive = t.dataset.preset === this.currentPreset;
            t.classList.toggle('active', isActive);
            if (isActive) {
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });

        this.presetTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const preset = tab.dataset.preset;
                if (preset === 'custom') {
                    this.openModal(this.customModal);
                } else {
                    this.presetTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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
                this.applyTransform();
            });
            this.resizeObserver.observe(this.boardViewport);
        }
        window.addEventListener('resize', () => {
            this.updateBoardDimensions();
            this.applyTransform();
        });
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
            setTimeout(() => {
                this.updateBoardDimensions();
                this.centerBoard(true);
            }, 100);
        });
    }

    updateBoardDimensions() {
        if (!this.boardViewport || !this.boardElement || !this.game) return;

        const isMobile = this.deviceProfile ? this.deviceProfile.isMobile : (window.innerWidth <= 768);
        const isSmallMobile = this.deviceProfile ? this.deviceProfile.isSmallMobile : (window.innerWidth <= 430);

        const padX = isSmallMobile ? 8 : (isMobile ? 12 : 16);
        const padY = isSmallMobile ? 8 : (isMobile ? 12 : 16);
        const availW = Math.max(60, this.boardViewport.clientWidth - padX);
        const availH = Math.max(60, this.boardViewport.clientHeight - padY);

        const minCell = isSmallMobile ? 22 : (isMobile ? (this.game.cols > 18 ? 24 : 20) : 22);
        const maxCell = isSmallMobile ? 48 : (isMobile ? 54 : 64);

        const maxCellW = Math.floor(availW / this.game.cols);
        const maxCellH = Math.floor(availH / this.game.rows);
        const fitCellSize = Math.min(maxCellW, maxCellH);

        let baseCellSize;
        if (fitCellSize >= minCell) {
            baseCellSize = Math.min(maxCell, fitCellSize);
        } else {
            baseCellSize = this.game.cols > 40 ? 24 : (isSmallMobile ? 26 : 28);
        }

        this.baseCellSize = baseCellSize;
        if (typeof this.scale !== 'number' || isNaN(this.scale)) {
            this.scale = 1.0;
        }
        const effectiveCellSize = Math.max(12, Math.min(180, Math.round(this.baseCellSize * this.scale)));
        this.boardElement.style.setProperty('--cell-size', `${effectiveCellSize}px`);
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
        this.cancelHold(true);
        this.clearLossCascadeTimeouts();
        this.hideEndgamePopup();
        this.hideLossInspectorHud();
        this.lastFatalCell = null;
        this.hideToast();
        if (this.game) {
            this.game.stopTimer();
        }

        this.game = new MinesweeperGame(preset, customConfig);
        this.presetTabs.forEach(t => {
            const isActive = t.dataset.preset === preset;
            t.classList.toggle('active', isActive);
            if (isActive) {
                t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });

        if (this.boardViewport) {
            this.boardViewport.scrollTo({ left: 0, top: 0, behavior: 'instant' });
        }

        const useQ = localStorage.getItem('ms_use_questions') === 'true';
        const practice = localStorage.getItem('ms_practice_mode') === 'true';
        this.game.useQuestionMarks = useQ;
        this.game.practiceMode = practice;
        this.game.noGuessMode = this.noGuessMode;
        this.updateNoGuessBadge();

        this.game.onStateChange = (state) => {
            this.updateFace(state);
            this.updateNoGuessBadge();
            this.updateUndoButtonVisibility();
            if (state === 'playing' && this.game.noGuessFallback) {
                this.showToast('Aviso: No-Guess desactivado para esta partida por densidad/distribución. Se generó modo clásico (haz clic en el indicador para ver detalles).', 'warning');
            }
        };
        this.game.onCellUpdate = (cell, delay) => this.renderCell(cell, delay);
        this.game.onTimerTick = (seconds) => this.renderTimer(seconds);
        this.game.onFlagsChange = (count) => this.renderMinesCount(count);
        this.game.onWin = (info) => this.handleWin(info);
        this.game.onLoss = (cell, cascadeList) => this.handleLoss(cell, cascadeList);

        this.renderBoardStructure();
        this.updateBoardDimensions();
        this.centerBoard(true);
        this.triggerBoardResetAnimation();
        this.updateFace('ready');
        this.renderMinesCount(this.game.getRemainingMines());
        this.renderTimer(0);
        this.updateUndoButtonVisibility();
    }

    renderBoardStructure() {
        this.boardElement.innerHTML = '';
        this.updateBoardDimensions();

        const fragment = document.createDocumentFragment();
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

                fragment.appendChild(el);
                this.cellElements[r][c] = el;
            }
        }
        this.boardElement.appendChild(fragment);
    }

    setupBoardEventDelegation() {
        if (!this.boardElement) return;

        // Pointerdown delegado: gestiona clics primarios y hold
        this.boardElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || e.isPrimary === false) return;
            if (this.spaceKeyPressed) return;

            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.row);
            const c = parseInt(cellEl.dataset.col);
            const cell = this.game?.board[r]?.[c];
            if (!cell) return;

            if (cell.isRevealed) {
                if (parseInt(cellEl.dataset.number) > 0) {
                    this.handleDigAction(r, c);
                }
                return;
            }

            this.startHold(r, c, cellEl, e.clientX, e.clientY);
        });

        // Click delegado: cavar o marcar
        this.boardElement.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.holdState && this.holdState.suppressClick) return;
            if (this.isSpacePanning || this.spaceKeyPressed) return;

            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.row);
            const c = parseInt(cellEl.dataset.col);
            const cell = this.game?.board[r]?.[c];
            if (!cell) return;

            if (cell.isRevealed) {
                this.handleDigAction(r, c);
            } else if (this.controlMode === 'flag') {
                this.handleFlagAction(r, c);
            } else {
                this.handleDigAction(r, c);
            }
        });

        // Clic derecho delegado: colocar bandera instantánea
        this.boardElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.row);
            const c = parseInt(cellEl.dataset.col);
            this.cancelHold(true);
            this.handleFlagAction(r, c);
        });

        // Hover de acorde delegado (solo al pasar sobre números revelados)
        this.boardElement.addEventListener('pointerover', (e) => {
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.row);
            const c = parseInt(cellEl.dataset.col);
            this.hoveredCell = { r, c };
            if (cellEl.classList.contains('revealed') && parseInt(cellEl.dataset.number) > 0) {
                this.highlightChordNeighbors(r, c, true);
            }
        });

        this.boardElement.addEventListener('pointerout', (e) => {
            const cellEl = e.target.closest('.cell');
            if (!cellEl) return;
            const r = parseInt(cellEl.dataset.row);
            const c = parseInt(cellEl.dataset.col);
            this.hoveredCell = null;
            this.highlightChordNeighbors(r, c, false);
            if (this.game && this.game.gameState !== 'lost' && this.game.gameState !== 'won') {
                this.updateFace(this.game.gameState);
            }
        });
    }

    bindCellEvents() {
        // Optimizado: delegado a setupBoardEventDelegation
    }

    setupZoomAndPan() {
        if (!this.boardViewport || !this.boardContainer) return;

        // 1. Deshabilitar zoom nativo del navegador a nivel de ventana y mapear a zoom del juego
        window.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false });

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
                    e.preventDefault();
                    this.zoomIn();
                } else if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
                    e.preventDefault();
                    this.zoomOut();
                } else if (e.key === '0' || e.code === 'Numpad0') {
                    e.preventDefault();
                    this.resetZoom();
                }
            }

            if (e.code === 'Space' && !e.repeat && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                this.spaceKeyPressed = true;
                this.boardViewport.classList.add('panning-space');
            }
        }, { passive: false });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.spaceKeyPressed = false;
                this.boardViewport.classList.remove('panning-space');
                if (this.isSpacePanning) {
                    this.isSpacePanning = false;
                    this.boardViewport.classList.remove('panning-active');
                }
            }
        });

        // 2. Control de Rueda en el Viewport (Zoom con Ctrl, Scroll con Shift, Pan vertical)
        this.boardViewport.addEventListener('wheel', (e) => {
            e.preventDefault();

            const rect = this.boardViewport.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const cursorY = e.clientY - rect.top;

            if (e.ctrlKey) {
                // Zoom focal hacia la posición exacta del cursor
                const zoomFactor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
                this.zoomAtPoint(this.scale * zoomFactor, cursorX, cursorY);
            } else if (e.shiftKey) {
                // Paneo horizontal suave
                const delta = e.deltaY || e.deltaX;
                this.panX -= delta * 1.1;
                this.applyTransform(true);
            } else {
                // Paneo 2D fluido con rueda o trackpad
                this.panX -= e.deltaX * 1.1;
                this.panY -= e.deltaY * 1.1;
                this.applyTransform(true);
            }
        }, { passive: false });

        // 3. Paneo con Botón Central (Middle Click) y Paneo con Espacio
        this.boardViewport.addEventListener('pointerdown', (e) => {
            // Botón central presionado (rueda)
            if (e.button === 1) {
                e.preventDefault();
                this.isMiddlePanning = true;
                this.panStartX = e.clientX;
                this.panStartY = e.clientY;
                this.startPanX = this.panX;
                this.startPanY = this.panY;
                this.boardViewport.classList.add('panning-active');
                return;
            }

            // Espacio + Click izquierdo, o click en zona libre del viewport
            if (e.button === 0 && (this.spaceKeyPressed || !e.target.closest('#game-board'))) {
                this.isSpacePanning = true;
                this.panStartX = e.clientX;
                this.panStartY = e.clientY;
                this.startPanX = this.panX;
                this.startPanY = this.panY;
                this.boardViewport.classList.add('panning-active');
            }

            // Soporte multitáctil para pellizco
            if (e.pointerType === 'touch') {
                this.activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (this.activeTouchPointers.size === 2) {
                    const [p1, p2] = Array.from(this.activeTouchPointers.values());
                    this.initialPinchDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                    this.initialPinchScale = this.scale;
                }
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isMiddlePanning || this.isSpacePanning) {
                this.panX = this.startPanX + (e.clientX - this.panStartX);
                this.panY = this.startPanY + (e.clientY - this.panStartY);
                this.applyTransform(true);
            }

            if (this.isTouchPanning) {
                this.panX = this.touchStartPanX + (e.clientX - this.touchStartX);
                this.panY = this.touchStartPanY + (e.clientY - this.touchStartY);
                this.applyTransform(true);
            }

            if (e.pointerType === 'touch' && this.activeTouchPointers.has(e.pointerId)) {
                this.activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (this.activeTouchPointers.size === 2) {
                    const [p1, p2] = Array.from(this.activeTouchPointers.values());
                    const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                    if (this.initialPinchDistance > 10) {
                        const midX = (p1.x + p2.x) / 2;
                        const midY = (p1.y + p2.y) / 2;
                        const rect = this.boardViewport.getBoundingClientRect();
                        const targetScale = this.initialPinchScale * (currentDist / this.initialPinchDistance);
                        this.zoomAtPoint(targetScale, midX - rect.left, midY - rect.top);
                    }
                }
            }
        }, { passive: true });

        const endPointerDrag = (e) => {
            if (e.button === 1 && this.isMiddlePanning) {
                this.isMiddlePanning = false;
                this.boardViewport.classList.remove('panning-active');
            }
            if (e.button === 0 && this.isSpacePanning) {
                this.isSpacePanning = false;
                if (!this.spaceKeyPressed) {
                    this.boardViewport.classList.remove('panning-active');
                }
            }
            if (this.isTouchPanning) {
                this.isTouchPanning = false;
                this.boardViewport?.classList.remove('panning-active');
                if (this.holdState) {
                    this.holdState.suppressClick = true;
                    setTimeout(() => {
                        if (this.holdState) this.holdState.suppressClick = false;
                    }, 250);
                }
            }
            if (e.pointerType === 'touch') {
                this.activeTouchPointers.delete(e.pointerId);
                if (this.activeTouchPointers.size < 2) {
                    this.initialPinchDistance = 0;
                }
            }
        };

        window.addEventListener('pointerup', endPointerDrag);
        window.addEventListener('pointercancel', endPointerDrag);

        // Prevenir autoscroll por defecto de Windows al pulsar la rueda
        window.addEventListener('auxclick', (e) => {
            if (e.button === 1) e.preventDefault();
        });

        // 4. Doble click y doble toque en el viewport para centrar / ajustar
        this.boardViewport.addEventListener('dblclick', (e) => {
            if (!e.target.closest('#game-board')) {
                this.centerBoard(true);
            }
        });

        let lastViewportTap = 0;
        this.boardViewport.addEventListener('touchend', (e) => {
            if (e.target.closest('#game-board')) return;
            const now = Date.now();
            if (now - lastViewportTap < 300) {
                this.centerBoard(true);
                lastViewportTap = 0;
            } else {
                lastViewportTap = now;
            }
        }, { passive: true });

        // 5. Botones del Widget Flotante
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('zoom-level-btn')?.addEventListener('click', () => this.resetZoom());
        document.getElementById('zoom-fit-btn')?.addEventListener('click', () => this.fitBoardToScreen());
    }

    zoomAtPoint(targetScale, focalX, focalY) {
        const minScale = 0.25;
        const maxScale = 3.5;
        const newScale = Math.max(minScale, Math.min(maxScale, targetScale));
        if (Math.abs(newScale - this.scale) < 0.001) return;

        const cols = this.game ? this.game.cols : (parseInt(this.boardElement?.style.getPropertyValue('--grid-cols')) || 10);
        const rows = this.game ? this.game.rows : (parseInt(this.boardElement?.style.getPropertyValue('--grid-rows')) || 8);
        const baseCell = this.baseCellSize || 36;
        const currentCellSize = Math.max(12, Math.min(180, Math.round(baseCell * this.scale)));
        const targetCellSize = Math.max(12, Math.min(180, Math.round(baseCell * newScale)));

        const currentBoardW = cols * currentCellSize;
        const currentBoardH = rows * currentCellSize;
        if (currentBoardW <= 0 || currentBoardH <= 0) return;

        const boardPointX = (focalX - this.panX) / currentBoardW;
        const boardPointY = (focalY - this.panY) / currentBoardH;

        this.scale = newScale;
        const newBoardW = cols * targetCellSize;
        const newBoardH = rows * targetCellSize;

        this.panX = Math.round(focalX - boardPointX * newBoardW);
        this.panY = Math.round(focalY - boardPointY * newBoardH);

        this.applyTransform(false);
    }

    zoomIn() {
        const rect = this.boardViewport?.getBoundingClientRect() || { width: 800, height: 600 };
        this.zoomAtPoint(this.scale * 1.25, rect.width / 2, rect.height / 2);
    }

    zoomOut() {
        const rect = this.boardViewport?.getBoundingClientRect() || { width: 800, height: 600 };
        this.zoomAtPoint(this.scale / 1.25, rect.width / 2, rect.height / 2);
    }

    resetZoom() {
        if (!this.boardViewport || !this.boardElement) return;
        this.scale = 1.0;
        const cols = this.game ? this.game.cols : (parseInt(this.boardElement.style.getPropertyValue('--grid-cols')) || 10);
        const rows = this.game ? this.game.rows : (parseInt(this.boardElement.style.getPropertyValue('--grid-rows')) || 8);
        const baseCell = this.baseCellSize || 36;
        const effectiveCellSize = Math.max(12, Math.min(180, Math.round(baseCell * this.scale)));
        const vw = this.boardViewport.clientWidth;
        const vh = this.boardViewport.clientHeight;
        const bw = cols * effectiveCellSize;
        const bh = rows * effectiveCellSize;
        this.panX = Math.round((vw - bw) / 2);
        this.panY = Math.round((vh - bh) / 2);
        this.applyTransform(false);
    }

    fitBoardToScreen() {
        if (!this.boardViewport || !this.boardElement) return;
        const cols = this.game ? this.game.cols : (parseInt(this.boardElement.style.getPropertyValue('--grid-cols')) || 10);
        const rows = this.game ? this.game.rows : (parseInt(this.boardElement.style.getPropertyValue('--grid-rows')) || 8);
        const vw = this.boardViewport.clientWidth;
        const vh = this.boardViewport.clientHeight;
        const baseCell = this.baseCellSize || 36;
        const baseW = cols * baseCell;
        const baseH = rows * baseCell;
        if (baseW <= 0 || baseH <= 0) return;

        const fitScale = Math.min((vw - 32) / baseW, (vh - 32) / baseH);
        this.scale = Math.max(0.25, Math.min(2.5, fitScale));
        const effectiveCellSize = Math.max(12, Math.min(180, Math.round(baseCell * this.scale)));
        const bw = cols * effectiveCellSize;
        const bh = rows * effectiveCellSize;
        this.panX = Math.round((vw - bw) / 2);
        this.panY = Math.round((vh - bh) / 2);
        this.applyTransform(false);
    }

    centerBoard(fitIfLarger = true) {
        if (!this.boardViewport || !this.boardElement) return;
        const cols = this.game ? this.game.cols : (parseInt(this.boardElement.style.getPropertyValue('--grid-cols')) || 10);
        const rows = this.game ? this.game.rows : (parseInt(this.boardElement.style.getPropertyValue('--grid-rows')) || 8);
        const vw = this.boardViewport.clientWidth;
        const vh = this.boardViewport.clientHeight;
        const baseCell = this.baseCellSize || 36;
        const baseW = cols * baseCell;
        const baseH = rows * baseCell;
        if (baseW <= 0 || baseH <= 0) return;

        if (fitIfLarger && (baseW > vw || baseH > vh)) {
            const fitScale = Math.min((vw - 24) / baseW, (vh - 24) / baseH);
            this.scale = Math.max(0.35, Math.min(1.0, fitScale));
        } else {
            this.scale = 1.0;
        }

        const effectiveCellSize = Math.max(12, Math.min(180, Math.round(baseCell * this.scale)));
        const bw = cols * effectiveCellSize;
        const bh = rows * effectiveCellSize;
        this.panX = Math.round((vw - bw) / 2);
        this.panY = Math.round((vh - bh) / 2);
        this.applyTransform(false);
    }

    applyTransform(onlyPan = false) {
        if (!this.boardContainer || !this.boardElement || !this.boardViewport) return;

        const cols = this.game ? this.game.cols : (parseInt(this.boardElement.style.getPropertyValue('--grid-cols')) || 10);
        const rows = this.game ? this.game.rows : (parseInt(this.boardElement.style.getPropertyValue('--grid-rows')) || 8);
        const baseCell = this.baseCellSize || 36;
        const effectiveCellSize = Math.max(12, Math.min(180, Math.round(baseCell * (this.scale || 1.0))));

        if (!onlyPan) {
            this.boardElement.style.setProperty('--cell-size', `${effectiveCellSize}px`);
        }

        const vw = this.boardViewport.clientWidth;
        const vh = this.boardViewport.clientHeight;
        const bw = cols * effectiveCellSize;
        const bh = rows * effectiveCellSize;

        const marginX = Math.min(200, Math.max(80, bw * 0.3));
        const marginY = Math.min(200, Math.max(80, bh * 0.3));

        const minX = -bw + marginX;
        const maxX = vw - marginX;
        const minY = -bh + marginY;
        const maxY = vh - marginY;

        this.panX = Math.max(minX, Math.min(maxX, this.panX));
        this.panY = Math.max(minY, Math.min(maxY, this.panY));

        this.boardContainer.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0)`;

        const text = document.getElementById('zoom-level-text');
        if (text) {
            text.textContent = `${Math.round(this.scale * 100)}%`;
        }
    }

    setupHoldInteraction() {
        this.pointerBubble = document.getElementById('pointer-action-bubble');
        this.bubbleRingFill = document.getElementById('bubble-ring-fill');
        this.bubbleIcon = document.getElementById('pointer-bubble-icon');
        this.bubbleLabel = document.getElementById('pointer-bubble-label');

        // Escuchadores globales de ventana para captura de toque y ratón sin pérdidas
        window.addEventListener('pointerup', (e) => this.handleGlobalPointerUp(e), { passive: false });
        window.addEventListener('pointermove', (e) => this.handleGlobalPointerMove(e), { passive: true });
        window.addEventListener('pointercancel', () => this.cancelHold(true));
        window.addEventListener('blur', () => this.cancelHold(true));

        window.addEventListener('contextmenu', (e) => {
            if (this.holdState && (this.holdState.active || this.holdState.suppressClick)) {
                e.preventDefault();
            }
        });
    }

    startHold(r, c, el, clientX, clientY) {
        if (!this.game || this.game.gameState === 'won' || this.game.gameState === 'lost') return;
        const cell = this.game.board[r]?.[c];
        if (!cell || cell.isRevealed) return;

        this.cancelHold(true);

        this.holdState.active = true;
        this.holdState.charged = false;
        this.holdState.r = r;
        this.holdState.c = c;
        this.holdState.cellEl = el;
        this.holdState.startX = clientX;
        this.holdState.startY = clientY;
        this.holdState.startPanX = this.panX;
        this.holdState.startPanY = this.panY;
        this.holdState.startTime = performance.now();

        el.classList.add('cell-hold-primed');
        this.updateFace('holding');

        // Mostrar indicador visual flotante sobre el cursor o dedo
        this.showPointerBubble(clientX, clientY, false);

        // Animar el anillo de progreso circular en ~260ms
        const holdDuration = 260;
        const start = performance.now();
        const circumference = 113.1;

        if (this.bubbleRingFill) {
            this.bubbleRingFill.style.transition = 'none';
            this.bubbleRingFill.style.strokeDashoffset = `${circumference}`;
        }

        const animateRing = (now) => {
            if (!this.holdState.active || this.holdState.charged) return;
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / holdDuration);
            const offset = circumference * (1 - progress);
            if (this.bubbleRingFill) {
                this.bubbleRingFill.style.strokeDashoffset = `${offset}`;
            }
            if (progress < 1) {
                this.holdState.animId = requestAnimationFrame(animateRing);
            }
        };
        this.holdState.animId = requestAnimationFrame(animateRing);

        // Al pasar 260ms, se activa el estado cargado y SE QUEDA ESPERANDO indefinidamente
        this.holdState.timerId = setTimeout(() => {
            this.chargeHold();
        }, holdDuration);
    }

    chargeHold() {
        if (!this.holdState.active) return;
        this.holdState.charged = true;

        if (this.holdState.animId) {
            cancelAnimationFrame(this.holdState.animId);
            this.holdState.animId = null;
        }

        // Vibración háptica en móviles
        if (navigator.vibrate) {
            navigator.vibrate(35);
        }

        const isAltFlag = this.controlMode === 'dig';

        if (this.holdState.cellEl) {
            this.holdState.cellEl.classList.remove('cell-hold-primed');
            this.holdState.cellEl.classList.add('cell-hold-charged');
            if (isAltFlag) {
                this.holdState.cellEl.classList.add('action-flag');
            }
        }

        // El bubble pasa a la acción contraria y se queda esperando hasta que el usuario suelte
        this.showPointerBubble(this.holdState.startX, this.holdState.startY, true);
    }

    showPointerBubble(x, y, charged) {
        if (!this.pointerBubble) return;

        const isAltFlag = this.controlMode === 'dig';
        // En modo pala: normal es Cavar, hold es Bandera
        // En modo bandera: normal es Bandera, hold es Cavar
        const isFlag = charged ? isAltFlag : !isAltFlag;

        if (charged) {
            this.pointerBubble.classList.add('bubble-charged');
            this.pointerBubble.classList.toggle('action-flag', isFlag);
            if (this.bubbleRingFill) {
                this.bubbleRingFill.style.strokeDashoffset = '0';
            }
            if (this.bubbleLabel) {
                this.bubbleLabel.textContent = isFlag ? '¡Soltar: Bandera!' : '¡Soltar: Cavar!';
            }
        } else {
            this.pointerBubble.classList.remove('bubble-charged', 'action-flag');
            if (this.bubbleLabel) {
                this.bubbleLabel.textContent = isFlag ? 'Bandera...' : 'Cavar...';
            }
        }

        // Iconos SVG limpios (cero emojis)
        if (this.bubbleIcon) {
            this.bubbleIcon.innerHTML = isFlag ? `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="5" y1="3" x2="5" y2="21" stroke-width="2.4"/>
                    <path d="M5 4c4-1.5 7.5 1.5 13.5 0l-1.8 7.5c-6 1.5-9.5-1.5-11.7 0" fill="#ef4444" stroke="#ef4444"/>
                    <circle cx="5" cy="3" r="1.2" fill="#ef4444"/>
                </svg>
            ` : `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M 2 22 C 2 16, 4 12, 6.5 9.5 L 13.5 16.5 C 12 19, 8 22, 2 22 Z" fill="currentColor" fill-opacity="0.35"/>
                    <line x1="3.5" y1="20.5" x2="8" y2="16" stroke-width="1.3" opacity="0.65"/>
                    <line x1="10" y1="13" x2="15.5" y2="7.5" stroke-width="2.2"/>
                    <path d="M 14 6 L 16.5 3.5 C 17.5 2.5, 19.5 2.5, 20.5 3.5 C 21.5 4.5, 21.5 6.5, 20.5 7.5 L 17 10" stroke-width="1.8"/>
                    <line x1="14" y1="6" x2="17" y2="9" stroke-width="2"/>
                </svg>
            `;
        }

        const placeBottom = y < 75;
        this.pointerBubble.classList.toggle('placement-bottom', placeBottom);

        const clampedX = Math.max(60, Math.min(window.innerWidth - 60, x));
        const posY = placeBottom ? (y + 12) : (y - 12);

        this.pointerBubble.style.left = `${clampedX}px`;
        this.pointerBubble.style.top = `${posY}px`;
        this.pointerBubble.classList.remove('hidden');
    }

    handleGlobalPointerUp(e) {
        if (this.isTouchPanning) {
            this.isTouchPanning = false;
            this.boardViewport?.classList.remove('panning-active');
            if (this.holdState) {
                this.holdState.suppressClick = true;
                setTimeout(() => {
                    if (this.holdState) this.holdState.suppressClick = false;
                }, 250);
            }
            return;
        }

        if (!this.holdState || !this.holdState.active) return;

        const { charged, r, c } = this.holdState;

        this.cancelHold(false);

        this.holdState.suppressClick = true;
        setTimeout(() => {
            if (this.holdState) {
                this.holdState.suppressClick = false;
            }
        }, 300);

        if (charged) {
            // Ejecutar la accion contraria al modo seleccionado
            if (this.controlMode === 'dig') {
                this.handleFlagAction(r, c);
            } else {
                this.handleDigAction(r, c);
            }
        } else {
            // Toque o clic rapido ordinario
            if (this.controlMode === 'flag') {
                this.handleFlagAction(r, c);
            } else {
                this.handleDigAction(r, c);
            }
        }

        this.holdState.active = false;
        this.holdState.charged = false;
        this.holdState.r = null;
        this.holdState.c = null;
        this.holdState.cellEl = null;

        if (this.game && this.game.gameState !== 'lost' && this.game.gameState !== 'won') {
            this.updateFace(this.game.gameState);
        }
    }

    handleGlobalPointerMove(e) {
        if (!this.holdState || !this.holdState.active) return;

        const dx = e.clientX - this.holdState.startX;
        const dy = e.clientY - this.holdState.startY;
        const dist = Math.hypot(dx, dy);

        // Si se mueve mas de 12px, el usuario esta haciendo paneo/scroll del tablero en movil
        if (dist > 12) {
            const wasTouch = e.pointerType === 'touch' || this.deviceProfile?.isTouch;
            const startX = this.holdState.startX;
            const startY = this.holdState.startY;
            const startPanX = this.holdState.startPanX ?? this.panX;
            const startPanY = this.holdState.startPanY ?? this.panY;

            this.cancelHold(true);

            if (wasTouch && !this.isTouchPanning) {
                this.isTouchPanning = true;
                this.touchStartX = startX;
                this.touchStartY = startY;
                this.touchStartPanX = startPanX;
                this.touchStartPanY = startPanY;
                this.boardViewport?.classList.add('panning-active');
            }

            if (this.game && this.game.gameState !== 'lost' && this.game.gameState !== 'won') {
                this.updateFace(this.game.gameState);
            }
        }
    }

    cancelHold(resetState = true) {
        if (!this.holdState) return;

        if (this.holdState.timerId) {
            clearTimeout(this.holdState.timerId);
            this.holdState.timerId = null;
        }
        if (this.holdState.animId) {
            cancelAnimationFrame(this.holdState.animId);
            this.holdState.animId = null;
        }
        if (this.holdState.cellEl) {
            this.holdState.cellEl.classList.remove('cell-hold-primed', 'cell-hold-charged', 'action-flag');
        }
        if (this.pointerBubble) {
            this.pointerBubble.classList.add('hidden');
            this.pointerBubble.classList.remove('bubble-charged', 'action-flag');
        }
        if (resetState) {
            this.holdState.active = false;
            this.holdState.charged = false;
            this.holdState.r = null;
            this.holdState.c = null;
            this.holdState.cellEl = null;
        }
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
        const parityClass = (cell.r + cell.c) % 2 === 0 ? 'cell-even' : 'cell-odd';

        if (cell.isRevealed) {
            if (cell.isMine) {
                el.className = `cell ${parityClass} revealed mine pop-in${cell.exploded ? ' exploded' : ''}`;
                el.innerHTML = this.getMineIcon(cell.exploded);
                el.dataset.number = '';
            } else if (cell.neighborMines > 0) {
                el.className = `cell ${parityClass} revealed num-${cell.neighborMines} pop-in`;
                el.dataset.number = cell.neighborMines;
                el.textContent = cell.neighborMines;
            } else {
                el.className = `cell ${parityClass} revealed pop-in`;
                el.textContent = '';
                el.dataset.number = '';
            }
        } else {
            if (cell.isFlagged) {
                el.className = `cell ${parityClass} unrevealed flagged`;
                el.innerHTML = this.getFlagIcon();
            } else if (cell.isQuestion) {
                el.className = `cell ${parityClass} unrevealed question`;
                el.innerHTML = '<span class="question-mark">?</span>';
            } else if (cell.wrongFlag) {
                el.className = `cell ${parityClass} unrevealed wrong-flag`;
                el.innerHTML = this.getWrongFlagIcon();
            } else {
                el.className = `cell ${parityClass} unrevealed`;
                el.textContent = '';
            }
            el.dataset.number = '';
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
        this.lastFatalCell = explodedCell;
        window.soundEngine?.playExplosion();
        this.boardElement.classList.add('shake-anim');
        setTimeout(() => this.boardElement.classList.remove('shake-anim'), 450);

        this.saveStats(false, 0, this.game.presetKey);
        this.updateFace('lost');

        let correctFlags = 0;
        let wrongFlags = 0;
        if (this.game && this.game.board) {
            for (let r = 0; r < this.game.rows; r++) {
                for (let c = 0; c < this.game.cols; c++) {
                    const cell = this.game.board[r][c];
                    if (cell.isFlagged) {
                        if (cell.isMine) correctFlags++;
                        else wrongFlags++;
                    }
                }
            }
        }
        const totalFlags = this.game ? this.game.flagsCount : 0;
        const accuracy = totalFlags > 0 ? Math.round((correctFlags / totalFlags) * 100) : 100;

        // Extraer coordenadas seguras sin riesgo de NaN
        let fatalR = null;
        let fatalC = null;
        if (explodedCell) {
            if (typeof explodedCell.row === 'number' && !isNaN(explodedCell.row)) fatalR = explodedCell.row;
            else if (typeof explodedCell.r === 'number' && !isNaN(explodedCell.r)) fatalR = explodedCell.r;
            if (typeof explodedCell.col === 'number' && !isNaN(explodedCell.col)) fatalC = explodedCell.col;
            else if (typeof explodedCell.c === 'number' && !isNaN(explodedCell.c)) fatalC = explodedCell.c;
        }
        if ((fatalR === null || fatalC === null) && this.game && this.game.board) {
            for (let r = 0; r < this.game.rows; r++) {
                for (let c = 0; c < this.game.cols; c++) {
                    const cl = this.game.board[r][c];
                    if (cl.exploded) {
                        fatalR = r;
                        fatalC = c;
                        explodedCell = cl;
                        break;
                    }
                }
                if (fatalR !== null) break;
            }
        }
        if (fatalR === null) fatalR = 0;
        if (fatalC === null) fatalC = 0;

        this.lastFatalCell = { row: fatalR, col: fatalC, r: fatalR, c: fatalC };

        if (this.lossHudCoords) {
            this.lossHudCoords.textContent = `Fila ${fatalR + 1}, Col ${fatalC + 1}`;
        }
        if (this.lossHudAccuracy) {
            this.lossHudAccuracy.textContent = `Banderas: ${correctFlags}/${totalFlags} (${accuracy}%)`;
        }

        // Resaltar casilla fatal con baliza visual de impacto
        const fatalEl = document.querySelector(`.cell[data-row="${fatalR}"][data-col="${fatalC}"]`);
        if (fatalEl) {
            fatalEl.classList.add('fatal-mine-beacon');
        }

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

        const canFullscreen = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
        if (!canFullscreen && this.deviceProfile?.isMobile) {
            btn.style.display = 'none';
            return;
        } else {
            btn.style.display = '';
        }

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

    updateNoGuessBadge() {
        if (!this.ngBadge) return;

        const isPlaying = Boolean(this.game && this.game.gameState === 'playing' && !this.game.firstClick);
        const isFallback = Boolean(this.game && this.game.noGuessFallback);
        const isGuaranteed = Boolean(this.game && this.game.isGuaranteedNoGuess);
        const isConfigActive = this.noGuessMode;

        // Reset de clases de estado
        this.ngBadge.classList.remove('ng-inactive', 'ng-locked', 'ng-fallback');

        const iconWrap = this.ngBadgeIconWrap || this.ngBadge.querySelector('.hud-badge-icon-wrap');
        const textSpan = this.ngBadgeText || this.ngBadge.querySelector('.hud-badge-text');
        const statusSpan = this.ngBadgeStatusIcon || this.ngBadge.querySelector('.hud-badge-status-icon');

        // SVGs temáticos sin emojis
        const shieldCheckSvg = `
            <svg class="hud-badge-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
            </svg>
        `;
        const shieldSlashSvg = `
            <svg class="hud-badge-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
        `;
        const warningTriangleSvg = `
            <svg class="hud-badge-icon hud-warning-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
        `;
        const lockSvg = `
            <svg class="hud-badge-lock-svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
        `;

        if (isFallback) {
            // Caso 1: Desactivado por fuerzas mayores (fallback al generar)
            this.ngBadge.classList.add('ng-fallback');
            if (isPlaying) this.ngBadge.classList.add('ng-locked');
            this.ngBadge.setAttribute('aria-pressed', 'false');
            this.ngBadge.title = 'Aviso: No-Guess no pudo garantizarse para esta partida (Clic para ver causa y detalles)';

            if (iconWrap) iconWrap.innerHTML = warningTriangleSvg;
            if (textSpan) textSpan.textContent = 'No-Guess';
            if (statusSpan) {
                statusSpan.innerHTML = '<span class="hud-badge-alert-pill">Alerta</span>';
            }
        } else if (isPlaying) {
            // Caso 2: Partida en curso activa (Bloqueado)
            this.ngBadge.classList.add('ng-locked');
            if (isGuaranteed) {
                this.ngBadge.setAttribute('aria-pressed', 'true');
                this.ngBadge.title = 'Modo No-Guess garantizado';
                if (iconWrap) iconWrap.innerHTML = shieldCheckSvg;
                if (textSpan) textSpan.textContent = 'No-Guess';
                if (statusSpan) statusSpan.innerHTML = lockSvg;
            } else {
                this.ngBadge.classList.add('ng-inactive');
                this.ngBadge.setAttribute('aria-pressed', 'false');
                this.ngBadge.title = 'Modo No-Guess INACTIVO: Bloqueado durante la partida clásica';
                if (iconWrap) iconWrap.innerHTML = shieldSlashSvg;
                if (textSpan) textSpan.textContent = 'No-Guess';
                if (statusSpan) statusSpan.innerHTML = lockSvg;
            }
        } else {
            // Caso 3: Fuera de juego activo (Ready / Idle / Fin de partida) -> Desbloqueado y toggleable
            if (isConfigActive) {
                this.ngBadge.setAttribute('aria-pressed', 'true');
                this.ngBadge.title = 'Modo No-Guess ACTIVO: Partida 100% resoluble sin 50/50 (Clic para alternar)';
                if (iconWrap) iconWrap.innerHTML = shieldCheckSvg;
                if (textSpan) textSpan.textContent = 'No-Guess';
                if (statusSpan) statusSpan.innerHTML = '';
            } else {
                this.ngBadge.classList.add('ng-inactive');
                this.ngBadge.setAttribute('aria-pressed', 'false');
                this.ngBadge.title = 'Modo No-Guess INACTIVO: Tableros clásicos estándar (Clic para activar)';
                if (iconWrap) iconWrap.innerHTML = shieldSlashSvg;
                if (textSpan) textSpan.textContent = 'No-Guess';
                if (statusSpan) statusSpan.innerHTML = '';
            }
        }

        if (this.updateCustomUI && this.customModal && this.customModal.classList.contains('active')) {
            this.updateCustomUI();
        }
    }

    handleNoGuessBadgeClick() {
        if (!this.game) return;

        // Si se desactivó por fuerzas mayores, desplegar ventana con información interactiva
        if (this.game.noGuessFallback) {
            this.showNoGuessFallbackDetails();
            return;
        }

        // Si la partida está en curso, advertir bloqueo amigablemente
        if (this.game.gameState === 'playing' && !this.game.firstClick) {
            if (this.game.isGuaranteedNoGuess) {
                this.showToast('Modo No-Guess garantizado. Finaliza o reinicia para cambiar de modo.', 'info');
            } else {
                this.showToast('Modo clásico desactivado. Reinicia para activar No-Guess.', 'info');
            }
            window.soundEngine?.playDig(1.5);
            return;
        }

        // Alternar libremente antes del primer clic o al finalizar
        this.noGuessMode = !this.noGuessMode;
        localStorage.setItem('ms_no_guess', this.noGuessMode ? 'true' : 'false');
        if (this.game) {
            this.game.noGuessMode = this.noGuessMode;
        }
        const checkbox = document.getElementById('setting-no-guess');
        if (checkbox) checkbox.checked = this.noGuessMode;
        this.updateNoGuessBadge();
        window.soundEngine?.playFlag();
        this.showToast(this.noGuessMode
            ? 'Modo No-Guess activado'
            : 'Modo No-Guess desactivado', 'info');
    }

    showNoGuessFallbackDetails() {
        if (!this.ngFallbackModal || !this.game) return;
        const info = this.game.noGuessFallbackInfo || {};
        const total = this.game.rows * this.game.cols;
        const density = Math.round((this.game.totalMines / Math.max(1, total)) * 100);

        if (this.ngFallbackDims) {
            this.ngFallbackDims.textContent = `${this.game.cols} × ${this.game.rows} (${total} celdas)`;
        }
        if (this.ngFallbackDensity) {
            this.ngFallbackDensity.textContent = `${this.game.totalMines} minas (${density}% densidad)`;
        }
        if (this.ngFallbackReason && info.reason) {
            this.ngFallbackReason.textContent = info.reason;
        }

        this.openModal(this.ngFallbackModal);
        window.soundEngine?.playFlag();
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

        // Botón / Badge No-Guess (Alternar Modo No-Guess con control de partida en curso)
        this.ngBadge?.addEventListener('click', () => {
            this.handleNoGuessBadgeClick();
        });

        // Acciones del modal informativo de Fallback No-Guess
        this.ngFallbackContinueBtn?.addEventListener('click', () => {
            this.closeAllModals();
        });
        this.ngFallbackRetryBtn?.addEventListener('click', () => {
            this.closeAllModals();
            this.startNewGame();
        });
        this.ngFallbackCustomizeBtn?.addEventListener('click', () => {
            this.closeAllModals();
            this.openModal(this.customModal);
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

        // Controles de inspección de derrota (Explosion UX)
        this.lossFocusMineBtn?.addEventListener('click', () => {
            this.focusOnFatalMine();
        });

        this.lossShowSummaryBtn?.addEventListener('click', () => {
            this.restoreEndgamePopup();
        });

        this.lossRetryBtn?.addEventListener('click', () => {
            window.soundEngine?.playDig(1.2);
            this.startNewGame();
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

            r = Math.max(8, Math.min(64, r));
            c = Math.max(8, Math.min(64, c));

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

            // Retroalimentación y Estado de Modo No-Guess en la personalización
            const isNG = Boolean(this.noGuessMode);
            const recMaxMines = Math.max(1, Math.floor(totalCells * 0.22));

            if (this.customNgStatusBadge) {
                this.customNgStatusBadge.textContent = isNG ? 'Activado' : 'Desactivado';
                this.customNgStatusBadge.className = `custom-ng-status-badge ${isNG ? 'ng-active' : 'ng-inactive'}`;
            }
            if (this.customNgToggleText) {
                this.customNgToggleText.textContent = isNG ? 'Desactivar' : 'Activar';
            }

            if (isNG) {
                if (density <= 22.0) {
                    if (this.customNgAdviceBadge) {
                        this.customNgAdviceBadge.textContent = 'Óptimo';
                        this.customNgAdviceBadge.className = 'custom-ng-advice-badge advice-optimo';
                    }
                    if (this.customNgAdviceText) {
                        this.customNgAdviceText.textContent = 'Generación 100% deductiva garantizada al instante.';
                    }
                    if (this.customNgRangeHint) {
                        this.customNgRangeHint.innerHTML = `Rango recomendado: <strong>1 a ${recMaxMines} minas</strong> (&le; 22.0% de ${totalCells} casillas).`;
                    }
                } else if (density <= 25.0) {
                    if (this.customNgAdviceBadge) {
                        this.customNgAdviceBadge.textContent = 'Exigente';
                        this.customNgAdviceBadge.className = 'custom-ng-advice-badge advice-exigente';
                    }
                    if (this.customNgAdviceText) {
                        this.customNgAdviceText.textContent = 'Densidad exigente para No-Guess: Puede requerir unos segundos para generar.';
                    }
                    if (this.customNgRangeHint) {
                        this.customNgRangeHint.innerHTML = `Para creación inmediata sin esperas, mantén hasta <strong>${recMaxMines} minas</strong> (&le; 22.0%).`;
                    }
                } else {
                    if (this.customNgAdviceBadge) {
                        this.customNgAdviceBadge.textContent = 'Zona Crítica';
                        this.customNgAdviceBadge.className = 'custom-ng-advice-badge advice-critico';
                    }
                    if (this.customNgAdviceText) {
                        this.customNgAdviceText.textContent = 'Densidad extrema: Probabilidad casi nula sin 50/50. Si agota intentos, se creará en modo tradicional con aviso.';
                    }
                    if (this.customNgRangeHint) {
                        this.customNgRangeHint.innerHTML = `Límite práctico recomendado para No-Guess: <strong>${recMaxMines} minas</strong>.`;
                    }
                }
            } else {
                if (this.customNgAdviceBadge) {
                    this.customNgAdviceBadge.textContent = 'Tradicional';
                    this.customNgAdviceBadge.className = 'custom-ng-advice-badge advice-tradicional';
                }
                if (this.customNgAdviceText) {
                    this.customNgAdviceText.textContent = 'Modo clásico aleatorio activo. Cualquier densidad hasta 85% se genera de inmediato.';
                }
                if (this.customNgRangeHint) {
                    this.customNgRangeHint.innerHTML = `Pueden aparecer 50/50 o deducciones imposibles. Activa No-Guess para partidas 100% lógicas.`;
                }
            }

            if (rowsRange) this.updateSliderProgress(rowsRange);
            if (colsRange) this.updateSliderProgress(colsRange);
            if (minesRange) this.updateSliderProgress(minesRange);
        };

        this.customNgToggleBtn?.addEventListener('click', () => {
            this.noGuessMode = !this.noGuessMode;
            localStorage.setItem('ms_no_guess', this.noGuessMode ? 'true' : 'false');
            if (this.game) {
                this.game.noGuessMode = this.noGuessMode;
            }
            const checkbox = document.getElementById('setting-no-guess');
            if (checkbox) checkbox.checked = this.noGuessMode;
            this.updateNoGuessBadge();
            this.updateCustomUI();
            window.soundEngine?.playFlag();
            this.showToast(this.noGuessMode
                ? 'Modo No-Guess activado (100% deductivo)'
                : 'Modo No-Guess desactivado (tradicional)', 'info');
        });

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

            // Hotkey C: Centrar cámara en la mina fatal (Explosion UX)
            if (keyLower === 'c' && this.game && this.game.gameState === 'lost') {
                e.preventDefault();
                this.focusOnFatalMine();
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
                } else if (this.game && this.game.gameState === 'lost' && this.lossInspectorHud && !this.lossInspectorHud.classList.contains('hidden')) {
                    this.restoreEndgamePopup();
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
        const noGuessCheck = document.getElementById('setting-no-guess');
        if (noGuessCheck) {
            noGuessCheck.checked = this.noGuessMode;
            noGuessCheck.addEventListener('change', (e) => {
                this.noGuessMode = e.target.checked;
                localStorage.setItem('ms_no_guess', this.noGuessMode ? 'true' : 'false');
                if (this.game) {
                    this.game.noGuessMode = this.noGuessMode;
                }
                this.updateNoGuessBadge();
                this.showToast(this.noGuessMode
                    ? 'Modo No-Guess activado'
                    : 'Modo No-Guess desactivado', 'info');
            });
        }

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

        const ngPill = document.getElementById('endgame-ng-pill');
        if (ngPill) {
            const isNG = Boolean(this.game && this.game.isGuaranteedNoGuess);
            ngPill.classList.toggle('hidden', !isNG);
            ngPill.textContent = 'No-Guess';
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

        // Mostrar popup y ocultar botón de reabrir / HUD de inspección
        this.endgamePopup.classList.remove('hidden');
        if (this.reopenEndgameBtn) {
            this.reopenEndgameBtn.classList.add('hidden');
        }
        if (this.lossInspectorHud) {
            this.lossInspectorHud.classList.add('hidden');
        }
    }

    minimizeEndgamePopup() {
        if (this.endgamePopup) {
            this.endgamePopup.classList.add('hidden');
        }
        if (this.game && this.game.gameState === 'lost') {
            if (this.lossInspectorHud) {
                this.lossInspectorHud.classList.remove('hidden');
            }
            if (this.reopenEndgameBtn) {
                this.reopenEndgameBtn.classList.add('hidden');
            }
        } else if (this.game && this.game.gameState === 'won') {
            if (this.reopenEndgameBtn) {
                this.reopenEndgameBtn.classList.remove('hidden');
            }
            if (this.lossInspectorHud) {
                this.lossInspectorHud.classList.add('hidden');
            }
        }
    }

    restoreEndgamePopup() {
        if (this.endgamePopup) {
            this.endgamePopup.classList.remove('hidden');
        }
        if (this.reopenEndgameBtn) {
            this.reopenEndgameBtn.classList.add('hidden');
        }
        if (this.lossInspectorHud) {
            this.lossInspectorHud.classList.add('hidden');
        }
    }

    hideEndgamePopup() {
        if (this.endgamePopup) {
            this.endgamePopup.classList.add('hidden');
        }
        if (this.reopenEndgameBtn) {
            this.reopenEndgameBtn.classList.add('hidden');
        }
        if (this.lossInspectorHud) {
            this.lossInspectorHud.classList.add('hidden');
        }
    }

    hideLossInspectorHud() {
        if (this.lossInspectorHud) {
            this.lossInspectorHud.classList.add('hidden');
        }
        document.querySelectorAll('.fatal-mine-beacon').forEach(el => el.classList.remove('fatal-mine-beacon'));
    }

    focusOnFatalMine() {
        if (!this.lastFatalCell) return;
        const row = (typeof this.lastFatalCell.row === 'number') ? this.lastFatalCell.row : this.lastFatalCell.r;
        const col = (typeof this.lastFatalCell.col === 'number') ? this.lastFatalCell.col : this.lastFatalCell.c;
        if (row === undefined || col === undefined) return;
        if (this.isEndgamePopupVisible()) {
            this.minimizeEndgamePopup();
        }
        this.focusOnCell(row, col);
        window.soundEngine?.playDig(1.6);
    }

    focusOnCell(row, col, targetScale = 1.3) {
        if (!this.boardViewport || !this.boardElement || !this.game) return;
        const cellEl = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        if (!cellEl) return;

        const vw = this.boardViewport.clientWidth;
        const vh = this.boardViewport.clientHeight;

        this.scale = Math.max(this.scale, targetScale);
        const baseCell = this.baseCellSize || 36;
        const effectiveCellSize = Math.max(12, Math.min(180, Math.round(baseCell * this.scale)));

        const cellCenterX = (col + 0.5) * effectiveCellSize;
        const cellCenterY = (row + 0.5) * effectiveCellSize;

        this.panX = Math.round((vw / 2) - cellCenterX);
        this.panY = Math.round((vh / 2) - cellCenterY);
        this.applyTransform(false);

        cellEl.classList.remove('fatal-mine-beacon');
        void cellEl.offsetWidth;
        cellEl.classList.add('fatal-mine-beacon');
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
        if (this.game && this.game.isGuaranteedNoGuess) {
            summary += `• Modo: No-Guess (100% Lógica Pura)\n`;
        }
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

if (typeof window !== 'undefined') {
    window.MinesweeperUI = MinesweeperUI;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MinesweeperUI };
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
