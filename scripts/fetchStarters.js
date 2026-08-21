import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STARTER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

async function fetchStarterPokemon() {
  console.log('Fetching starter Pokémon data from PokeAPI (IDs 1-9)...');
  const pokemonList = [];

  for (const id of STARTER_IDS) {
    try {
      console.log(`Fetching Pokémon #${id}...`);
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} for ID ${id}`);
      }

      const data = await response.json();

      const types = data.types.map((t) => t.type.name);

      const stats = {};
      data.stats.forEach((s) => {
        stats[s.stat.name] = s.base_stat;
      });

      const formatted = {
        id: data.id,
        name: data.name,
        types: types,
        stats: {
          hp: stats['hp'] || 0,
          attack: stats['attack'] || 0,
          defense: stats['defense'] || 0,
          specialAttack: stats['special-attack'] || 0,
          specialDefense: stats['special-defense'] || 0,
          speed: stats['speed'] || 0,
        },
        sprites: {
          normal: data.sprites.front_default || data.sprites.other?.['official-artwork']?.front_default,
          shiny: data.sprites.front_shiny || data.sprites.other?.['official-artwork']?.front_shiny,
        },
      };

      pokemonList.push(formatted);
    } catch (err) {
      console.error(`Failed to fetch Pokémon ID ${id}:`, err.message);
    }
  }

  const outputDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'pokemon.json');
  fs.writeFileSync(outputPath, JSON.stringify(pokemonList, null, 2), 'utf-8');

  console.log(`Successfully saved ${pokemonList.length} starter Pokémon to ${outputPath}`);
}

fetchStarterPokemon();
