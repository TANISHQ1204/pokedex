import React, { useState, useMemo } from 'react';
import pokemonList from '../data/pokemon.json' with { type: 'json' };
import PowerCard from '../components/PowerCard';
import PowerCardRevealModal from '../components/PowerCardRevealModal';
import './DesignPreviewPage.css';

export default function DesignPreviewPage() {
  // Global View Settings
  const [globalShiny, setGlobalShiny] = useState(false);
  const [enableTilt, setEnableTilt] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'comparison'
  const [filterType, setFilterType] = useState('all');

  // Reveal Modal State
  const [revealPokemon, setRevealPokemon] = useState(null);
  const [isRevealOpen, setIsRevealOpen] = useState(false);

  // Per-card shiny overrides map: cardId -> boolean
  const [cardShinyMap, setCardShinyMap] = useState({});

  // Map pokemonList by name for showcase selection
  const pokemonMap = useMemo(() => {
    const map = new Map();
    pokemonList.forEach((p) => map.set(p.name.toLowerCase(), p));
    return map;
  }, []);

  const charizard = pokemonMap.get('charizard');
  const gyarados = pokemonMap.get('gyarados');
  const pikachu = pokemonMap.get('pikachu');
  const rayquaza = pokemonMap.get('rayquaza');
  const gengar = pokemonMap.get('gengar');
  const lucario = pokemonMap.get('lucario');

  const showcaseCards = [
    { pokemon: charizard, label: 'Fire / Flying' },
    { pokemon: gyarados, label: 'Water / Flying' },
    { pokemon: pikachu, label: 'Electric' },
    { pokemon: rayquaza, label: 'Dragon / Flying' },
    { pokemon: gengar, label: 'Ghost / Poison' },
    { pokemon: lucario, label: 'Fighting / Steel' },
  ].filter((c) => c.pokemon);

  const filteredCards = showcaseCards.filter((item) => {
    if (filterType === 'all') return true;
    return item.pokemon.types.includes(filterType);
  });

  const toggleCardShiny = (id) => {
    setCardShinyMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isCardShiny = (pokemon) => {
    if (cardShinyMap[pokemon.id] !== undefined) {
      return cardShinyMap[pokemon.id];
    }
    return globalShiny;
  };

  const handleOpenReveal = (pokemon) => {
    setRevealPokemon(pokemon);
    setIsRevealOpen(true);
  };

  return (
    <div className="preview-page-container">
      {/* Design Checkpoint Header */}
      <header className="preview-header">
        <div className="preview-badge-row">
          <span className="preview-tag">DESIGN CHECKPOINT</span>
          <span className="preview-tag dev-tag">LOCAL PREVIEW ONLY</span>
        </div>
        <h1 className="preview-title">⚡ Power Card Trophy Type Preview</h1>
        <p className="preview-subtitle">
          An ultra-rare holographic trading card design featuring type-themed dynamic background elements, 
          3D out-of-bounds breakout artwork, interactive specular tilt, and dual-type comparison options.
        </p>
      </header>

      {/* Global Control Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-group">
          <label className="toolbar-label">View Mode:</label>
          <div className="segmented-control">
            <button
              className={`segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              🖼️ Showcase Gallery
            </button>
            <button
              className={`segmented-btn ${viewMode === 'comparison' ? 'active' : ''}`}
              onClick={() => setViewMode('comparison')}
            >
              ⚖️ Dual-Type Comparisons
            </button>
          </div>
        </div>

        <div className="toolbar-group">
          <button
            className={`preview-toggle-btn ${globalShiny ? 'shiny-active' : ''}`}
            onClick={() => setGlobalShiny(!globalShiny)}
          >
            {globalShiny ? '✨ Global Shiny: ON' : '⭐ Global Shiny: OFF'}
          </button>

          <button
            className={`preview-toggle-btn ${enableTilt ? 'tilt-active' : ''}`}
            onClick={() => setEnableTilt(!enableTilt)}
          >
            {enableTilt ? '🎯 3D Tilt: ON' : '🛑 3D Tilt: OFF'}
          </button>

          <button
            className="preview-trigger-reveal-btn"
            onClick={() => handleOpenReveal(charizard || showcaseCards[0].pokemon)}
          >
            🎬 Test Drop Reveal Animation
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: SHOWCASE GRID */}
      {viewMode === 'grid' && (
        <div className="preview-section">
          {/* Type Filter Pills */}
          <div className="type-filter-bar">
            <span className="filter-label">Filter by Type:</span>
            {['all', 'fire', 'water', 'electric', 'dragon', 'ghost', 'steel'].map((t) => (
              <button
                key={t}
                className={`type-filter-pill ${filterType === t ? 'active' : ''}`}
                onClick={() => setFilterType(t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="power-cards-grid">
            {filteredCards.map(({ pokemon, label }) => {
              const shiny = isCardShiny(pokemon);
              return (
                <div key={pokemon.id} className="preview-card-item">
                  <div className="card-item-header">
                    <span className="card-type-label">{label}</span>
                    <button
                      className="card-shiny-toggle"
                      onClick={() => toggleCardShiny(pokemon.id)}
                    >
                      {shiny ? '✨ Shiny' : '⭐ Normal'}
                    </button>
                  </div>

                  <PowerCard
                    pokemon={pokemon}
                    isShiny={shiny}
                    enableTilt={enableTilt}
                  />

                  <div className="card-item-footer">
                    <button
                      className="card-reveal-btn"
                      onClick={() => handleOpenReveal(pokemon)}
                    >
                      ▶ Play Reveal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DUAL-TYPE COMPARISON */}
      {viewMode === 'comparison' && (
        <div className="preview-section comparison-section">
          <div className="comparison-intro">
            <h2>⚖️ Dual-Type Aesthetic Comparison</h2>
            <p>
              For dual-type Pokémon like <strong>Charizard</strong> (Fire / Flying) and <strong>Rayquaza</strong> (Dragon / Flying), 
              below are 3 treatment options to compare: Version A (Primary Type theme), Version B (Secondary Type theme), 
              and Version C (Blended Dual Gradient & Dual Particle Aura).
            </p>
          </div>

          {/* Charizard Dual-Type Comparison Row */}
          {charizard && (
            <div className="comparison-block">
              <h3 className="comparison-pokemon-title">🔥 Charizard — Fire / Flying Comparison</h3>
              <div className="comparison-grid">
                <div className="comparison-card-wrapper">
                  <span className="comp-version-tag">Version A: Primary Type (Fire)</span>
                  <PowerCard
                    pokemon={charizard}
                    isShiny={isCardShiny(charizard)}
                    themeTypeOverride="fire"
                    enableTilt={enableTilt}
                  />
                  <p className="comp-desc">Warm volcanic ember gradient with rising spark particles.</p>
                </div>

                <div className="comparison-card-wrapper">
                  <span className="comp-version-tag">Version B: Secondary Type (Flying/Sky)</span>
                  <PowerCard
                    pokemon={charizard}
                    isShiny={isCardShiny(charizard)}
                    themeTypeOverride="flying"
                    enableTilt={enableTilt}
                  />
                  <p className="comp-desc">Atmospheric blue/indigo cloud gradient with air aura.</p>
                </div>

                <div className="comparison-card-wrapper recommended">
                  <span className="comp-version-tag rec-tag">⭐ Version C: Blended Dual-Type</span>
                  <PowerCard
                    pokemon={charizard}
                    isShiny={isCardShiny(charizard)}
                    themeTypeOverride="blended"
                    enableTilt={enableTilt}
                  />
                  <p className="comp-desc">Dual fire-indigo gradient + combined fire & wave energy aura.</p>
                </div>
              </div>
            </div>
          )}

          {/* Rayquaza Dual-Type Comparison Row */}
          {rayquaza && (
            <div className="comparison-block" style={{ marginTop: '40px' }}>
              <h3 className="comparison-pokemon-title">🐲 Rayquaza — Dragon / Flying Comparison</h3>
              <div className="comparison-grid">
                <div className="comparison-card-wrapper">
                  <span className="comp-version-tag">Version A: Primary Type (Dragon)</span>
                  <PowerCard
                    pokemon={rayquaza}
                    isShiny={isCardShiny(rayquaza)}
                    themeTypeOverride="dragon"
                    enableTilt={enableTilt}
                  />
                  <p className="comp-desc">Royal cosmic indigo gradient with mystical dragon flare.</p>
                </div>

                <div className="comparison-card-wrapper">
                  <span className="comp-version-tag">Version B: Secondary Type (Flying)</span>
                  <PowerCard
                    pokemon={rayquaza}
                    isShiny={isCardShiny(rayquaza)}
                    themeTypeOverride="flying"
                    enableTilt={enableTilt}
                  />
                  <p className="comp-desc">High altitude sky blue aura with wind distortion.</p>
                </div>

                <div className="comparison-card-wrapper recommended">
                  <span className="comp-version-tag rec-tag">⭐ Version C: Blended Dual-Type</span>
                  <PowerCard
                    pokemon={rayquaza}
                    isShiny={isCardShiny(rayquaza)}
                    themeTypeOverride="blended"
                    enableTilt={enableTilt}
                  />
                  <p className="comp-desc">Multidimensional cosmic-dragon fusion with star particles.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* On-Demand Drop Reveal Animation Modal */}
      <PowerCardRevealModal
        pokemon={revealPokemon}
        isOpen={isRevealOpen}
        onClose={() => setIsRevealOpen(false)}
        initialShiny={revealPokemon ? isCardShiny(revealPokemon) : false}
      />
    </div>
  );
}
