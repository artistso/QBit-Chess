import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';

interface EntangledPairInfo {
  id: string;
  pieceA: string;
  pieceB: string;
  coherenceA: number;
  coherenceB: number;
}

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [quantumLabOpen, setQuantumLabOpen] = useState(false);
  const [hodgeCageActive, setHodgeCageActive] = useState(true);
  const [multiHitActive, setMultiHitActive] = useState(true);
  const [soundActive, setSoundActive] = useState(true);
  const [activeTab, setActiveTab] = useState<'booms' | 'hodge' | 'decoherence' | 'entangle'>('booms');
  const [entangledPairs, setEntangledPairs] = useState<EntangledPairInfo[]>([]);
  const [lastSonicPlayed, setLastSonicPlayed] = useState<string | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
        setQuantumLabOpen(false);
      } else if (e.key === 'q' || e.key === 'Q') {
        setQuantumLabOpen((prev) => !prev);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Poll quantum telemetry for live HUD indicators
  useEffect(() => {
    const timer = setInterval(() => {
      const win = window as unknown as {
        wizardChess?: {
          getQuantumTelemetry?: () => {
            pairsList?: EntangledPairInfo[];
            multiHit?: boolean;
            activeCages?: number;
          };
        };
      };
      if (win.wizardChess?.getQuantumTelemetry) {
        const telem = win.wizardChess.getQuantumTelemetry();
        if (telem?.pairsList) {
          setEntangledPairs(telem.pairsList);
        }
      }
    }, 800);
    return () => clearInterval(timer);
  }, []);

  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  const handleToggleHodge = () => {
    const win = window as unknown as { wizardChess?: { toggleHodgeCages?: () => boolean } };
    if (win.wizardChess?.toggleHodgeCages) {
      const next = win.wizardChess.toggleHodgeCages();
      setHodgeCageActive(next);
    }
  };

  const handleToggleDecoherence = () => {
    const win = window as unknown as { wizardChess?: { toggleDecoherenceMode?: () => boolean } };
    if (win.wizardChess?.toggleDecoherenceMode) {
      const next = win.wizardChess.toggleDecoherenceMode();
      setMultiHitActive(next);
    }
  };

  const handleToggleSound = () => {
    const win = window as unknown as { wizardChess?: { toggleQuantumSound?: () => boolean } };
    if (win.wizardChess?.toggleQuantumSound) {
      const next = win.wizardChess.toggleQuantumSound();
      setSoundActive(next);
    }
  };

  const handlePlaySonicBoom = (pieceType: string) => {
    const win = window as unknown as { wizardChess?: { triggerPieceSonicBoom?: (t: string) => void } };
    if (win.wizardChess?.triggerPieceSonicBoom) {
      win.wizardChess.triggerPieceSonicBoom(pieceType);
      setLastSonicPlayed(pieceType);
      setTimeout(() => setLastSonicPlayed(null), 1200);
    }
  };

  const handleEntangleRandom = () => {
    const win = window as unknown as { wizardChess?: { entangleRandomPair?: () => unknown; getQuantumTelemetry?: () => { pairsList?: EntangledPairInfo[] } } };
    if (win.wizardChess?.entangleRandomPair) {
      win.wizardChess.entangleRandomPair();
      if (win.wizardChess.getQuantumTelemetry) {
        const telem = win.wizardChess.getQuantumTelemetry();
        if (telem?.pairsList) setEntangledPairs(telem.pairsList);
      }
    }
  };

  const handleClearEntanglements = () => {
    const win = window as unknown as { wizardChess?: { clearEntanglements?: () => void } };
    if (win.wizardChess?.clearEntanglements) {
      win.wizardChess.clearEntanglements();
      setEntangledPairs([]);
    }
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Quantum Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Hodge Cage Quantum Shells...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Show HUD Controls"
      >
        Show UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Quantum Wizard Chess</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">White to Move</span>
            <span className="mode-badge" id="mode-badge">Playing as White</span>
          </div>
          <button
            type="button"
            className={`hud-btn quantum-indicator-pill ${quantumLabOpen ? 'active' : ''}`}
            id="btn-quantum-pill"
            onClick={() => setQuantumLabOpen((prev) => !prev)}
            title="Open Quantum Laboratory [Shortcut: Q]"
          >
            <span className="quantum-atom-icon">⚛</span>
            <span>Quantum Lab</span>
            <span className="quantum-tag-badge">
              {entangledPairs.length > 0 ? `${entangledPairs.length} Entangled` : 'Active'}
            </span>
          </button>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls &amp; Quantum Physics</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Quantum Mechanics</div>

          <button
            type="button"
            className={`hud-btn ${hodgeCageActive ? 'active' : ''}`}
            id="btn-toggle-hodge"
            title="Toggle Hodge Cage electron lattice force fields"
            onClick={handleToggleHodge}
          >
            ⚛ Hodge Cage: {hodgeCageActive ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            className={`hud-btn ${multiHitActive ? 'active' : ''}`}
            id="btn-toggle-decoherence"
            title="Toggle Energy Decoherence Scalars (Multiple hits to defeat pieces)"
            onClick={handleToggleDecoherence}
          >
            ⚡ Combat: {multiHitActive ? 'Multi-Hit' : 'Classic 1-Hit'}
          </button>

          <button
            type="button"
            className={`hud-btn ${soundActive ? 'active' : ''}`}
            id="btn-toggle-sound"
            title="Toggle procedural supersonic sonic boom audio"
            onClick={handleToggleSound}
          >
            🔊 Booms: {soundActive ? 'ON' : 'MUTED'}
          </button>

          <button
            type="button"
            className="hud-btn primary"
            id="btn-open-quantum-lab"
            title="Open Quantum Physics Laboratory"
            onClick={() => {
              setQuantumLabOpen(true);
              setMobileSheetOpen(false);
            }}
          >
            ✦ Open Quantum Lab
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display &amp; Gestures</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Attack &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp; Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; WASD: Fly &nbsp;•&nbsp; Q: Quantum Lab &nbsp;•&nbsp; H: Hide UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      {/* Quantum Laboratory Collapsible Drawer */}
      <div className={`quantum-dock ${quantumLabOpen ? 'open' : ''}`} id="quantum-dock">
        <div className="quantum-dock-header">
          <div className="quantum-dock-title-group">
            <span className="quantum-dock-icon">⚛</span>
            <div>
              <div className="quantum-dock-title">Quantum Physics Laboratory</div>
              <div className="quantum-dock-subtitle">
                Hodge Cage Electron Fields • Piece-Specific Sonic Booms • Decoherence Scalars • Bell-State Entanglement
              </div>
            </div>
          </div>
          <div className="quantum-dock-header-actions">
            <button
              type="button"
              className="quantum-close-btn"
              onClick={() => setQuantumLabOpen(false)}
              aria-label="Close Quantum Lab"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="quantum-tabs">
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'booms' ? 'active' : ''}`}
            onClick={() => setActiveTab('booms')}
          >
            🔊 Sonic Booms ({lastSonicPlayed ? `Fired ${lastSonicPlayed.toUpperCase()}` : '6 Pieces'})
          </button>
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'hodge' ? 'active' : ''}`}
            onClick={() => setActiveTab('hodge')}
          >
            ⚛ Hodge Cage ({hodgeCageActive ? 'Active' : 'Off'})
          </button>
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'decoherence' ? 'active' : ''}`}
            onClick={() => setActiveTab('decoherence')}
          >
            ⚡ Energy Decoherence Scalars ({multiHitActive ? 'Multi-Hit' : '1-Hit'})
          </button>
          <button
            type="button"
            className={`quantum-tab-btn ${activeTab === 'entangle' ? 'active' : ''}`}
            onClick={() => setActiveTab('entangle')}
          >
            🔗 Quantum Entanglement ({entangledPairs.length})
          </button>
        </div>

        {/* Tab 1: Piece-Unique Sonic Booms */}
        {activeTab === 'booms' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">Supersonic N-Wave Acoustic Shockwaves</div>
              <p>
                Each sculpted piece features an entirely unique procedural acoustic and visual signature synthesized via the Web Audio API. Hits trigger supersonic Mach shockwave rings, vapor condensation cones, and physical sub-bass pressure drops!
              </p>
            </div>

            <div className="quantum-piece-grid">
              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♙</span>
                  <span className="piece-name">Pawn — Kinetic Dagger</span>
                </div>
                <div className="piece-desc">
                  Sharp needle crack (520Hz down to 90Hz sweep) with high-frequency crystalline electron spark flutter. Localized azure conical shockwave.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('pawn')}
                >
                  ⚡ Fire Pawn Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♘</span>
                  <span className="piece-name">Knight — Cavalry Trample</span>
                </div>
                <div className="piece-desc">
                  Double-strike thunderclap (0ms &amp; 85ms) with hooved 110Hz-32Hz low-frequency resonance and ground crackling electrical discharge.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('knight')}
                >
                  ⚡ Fire Knight Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♗</span>
                  <span className="piece-name">Bishop — Sacred Resonator</span>
                </div>
                <div className="piece-desc">
                  Harmonic singing bowl overtone choir (528Hz, 792Hz, 1056Hz) imploding into a concentrated vertical laser sonic blast with prismatic halos.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('bishop')}
                >
                  ⚡ Fire Bishop Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♖</span>
                  <span className="piece-name">Rook — Earthshaker Ram</span>
                </div>
                <div className="piece-desc">
                  Catastrophic subterranean 42Hz baritone drop, subterranean masonry displacement, and square-shaped seismic shockwaves across the cathedral floor.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('rook')}
                >
                  ⚡ Fire Rook Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♕</span>
                  <span className="piece-name">Queen — Singularity Supernova</span>
                </div>
                <div className="piece-desc">
                  Gravitational vortex whine (260Hz up to 1400Hz) snapping into dual supersonic shockwaves with swirling chorus and ultraviolet electron spiral.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('queen')}
                >
                  ⚡ Fire Queen Sonic Boom
                </button>
              </div>

              <div className="quantum-piece-card">
                <div className="piece-card-header">
                  <span className="piece-symbol">♔</span>
                  <span className="piece-name">King — Monarch Cataclysm</span>
                </div>
                <div className="piece-desc">
                  Royal bronze temple gong resonance (110Hz, 220Hz, 330Hz, 660Hz) with 1.4s cathedral stone echo and a majestic coronal shockwave ring.
                </div>
                <button
                  type="button"
                  className="piece-fire-btn"
                  onClick={() => handlePlaySonicBoom('king')}
                >
                  ⚡ Fire King Sonic Boom
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hodge Cage Force Fields */}
        {activeTab === 'hodge' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">The Hodge Cage: Interconnected Electron Force Field</div>
              <p>
                The Hodge Cage is a form-fitting quantum force field tailored to the silhouette of each stone statue. It represents a closed manifold of interconnected electrons orbiting in probability orbitals. The cage absorbs supersonic impacts, deflecting kinetic energy through electron wave dissipation.
              </p>
            </div>

            <div className="quantum-options-row">
              <div className="quantum-option-box">
                <div className="option-label">Hodge Cage Force Field Visibility</div>
                <div className="option-sub">Show / hide the 3D geodesic electron lattice around all pieces</div>
                <button
                  type="button"
                  className={`quantum-action-btn ${hodgeCageActive ? 'active' : ''}`}
                  onClick={handleToggleHodge}
                >
                  {hodgeCageActive ? 'Disable Hodge Cages' : 'Enable Hodge Cages'}
                </button>
              </div>

              <div className="quantum-option-box">
                <div className="option-label">Electron Probability Lattice</div>
                <div className="option-sub">White pieces display Electric Cyan (#00f5d4), Black pieces display Quantum Violet (#c77dff). Nodes orbit along geodesic paths.</div>
                <div className="lattice-status-badge">12 Orbiting Electron Nodes per Piece • Shimmering Fresnel Shell</div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Energy Decoherence Scalars */}
        {activeTab === 'decoherence' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">Energy Decoherence Levels &amp; Multiple Interactions</div>
              <p>
                In quantum mode, one melee interaction cannot completely end another piece. Instead, pieces possess an Energy Decoherence Level (Coherence Ψ starting at 100%). Each attack depletes a portion of the defender's Hodge Cage according to combat scalars. Only when coherence drops to 0% does total wave-function collapse occur, shattering the stone statue!
              </p>
            </div>

            <div className="quantum-options-row">
              <div className="quantum-option-box">
                <div className="option-label">Combat Resolution Mode</div>
                <div className="option-sub">Choose between Multi-Hit Quantum Attrition or Classic 1-Hit Capture</div>
                <button
                  type="button"
                  className={`quantum-action-btn ${multiHitActive ? 'active' : ''}`}
                  onClick={handleToggleDecoherence}
                >
                  {multiHitActive ? 'Switch to Classic 1-Hit' : 'Switch to Multi-Hit Scalars'}
                </button>
              </div>

              <div className="quantum-option-box">
                <div className="option-label">Decoherence Scalar Matrix</div>
                <table className="quantum-table">
                  <thead>
                    <tr>
                      <th>Piece</th>
                      <th>Strikes to Collapse</th>
                      <th>Attack Scalar</th>
                      <th>Resistance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Pawn ♙</td>
                      <td>2 Hits</td>
                      <td>0.50</td>
                      <td>Standard</td>
                    </tr>
                    <tr>
                      <td>Knight ♘ / Bishop ♗</td>
                      <td>3 Hits</td>
                      <td>0.42</td>
                      <td>Reinforced</td>
                    </tr>
                    <tr>
                      <td>Rook ♖</td>
                      <td>4 Hits</td>
                      <td>0.58</td>
                      <td>Heavy Mass</td>
                    </tr>
                    <tr>
                      <td>Queen ♕</td>
                      <td>4 Hits</td>
                      <td>0.75</td>
                      <td>High Energy</td>
                    </tr>
                    <tr>
                      <td>King ♔</td>
                      <td>5 Hits</td>
                      <td>0.60</td>
                      <td>Royal Core</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Quantum Entanglement */}
        {activeTab === 'entangle' && (
          <div className="quantum-tab-content">
            <div className="quantum-info-card">
              <div className="quantum-info-heading">Bell-State Quantum Entanglement &amp; Spooky Action</div>
              <p>
                When pieces meet and clash from opposite sides, an EPR Quantum Entanglement Pair is established between them! A luminous 3D undulating quantum wormhole connects them across the board. Whenever one piece is attacked, 38% of the decoherence energy instantly transmits through the entanglement bridge to affect your piece or the opponent's!
              </p>
            </div>

            <div className="quantum-options-row">
              <div className="quantum-option-box">
                <div className="option-label">Active Entangled Pairs: {entangledPairs.length}</div>
                <div className="entangled-list">
                  {entangledPairs.length === 0 ? (
                    <div className="empty-entangle-msg">
                      No pieces currently entangled. Make a move to engage in combat, or click below to entangle random opposing pieces!
                    </div>
                  ) : (
                    entangledPairs.map((pair) => (
                      <div key={pair.id} className="entangled-pair-pill">
                        <span className="pair-link-icon">⟷</span>
                        <span className="pair-label">{pair.pieceA}</span>
                        <span className="pair-bracket">Ψ: {Math.round(pair.coherenceA * 100)}%</span>
                        <span className="pair-sep">•</span>
                        <span className="pair-label">{pair.pieceB}</span>
                        <span className="pair-bracket">Ψ: {Math.round(pair.coherenceB * 100)}%</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="entangle-btn-row">
                  <button
                    type="button"
                    className="quantum-action-btn active"
                    onClick={handleEntangleRandom}
                  >
                    🔗 Entangle Random Opposing Pieces
                  </button>
                  {entangledPairs.length > 0 && (
                    <button
                      type="button"
                      className="quantum-action-btn secondary"
                      onClick={handleClearEntanglements}
                    >
                      Sever All Entanglements
                    </button>
                  )}
                </div>
              </div>

              <div className="quantum-option-box">
                <div className="option-label">Spooky Action Mechanics</div>
                <div className="option-sub">
                  • Kinetic / Sonic shock transmission: 38% decoherence transferred across the wormhole<br />
                  • Sympathetic Hodge Cage electron flare on receiving twin<br />
                  • Catastrophic entanglement rupture if twin collapses
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
