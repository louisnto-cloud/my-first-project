/* LearnQuest — curriculum structure (BC K-7, Math + English Language Arts)
   Each skill entry becomes a level node. Review Mix nodes are auto-inserted
   every 5th node; a Boss Challenge caps every region. */
'use strict';

const CURRICULUM = [
  {
    id: 'math', name: 'Math World', emoji: '🌋', tint: '#ff7a59',
    regions: [
      {
        id: 'm-k', grade: 'K', name: 'Counting Cove', emoji: '🏝️', tint: '#4ecdc4', audio: 'full',
        skills: [
          { id: 'count10', name: 'Counting to 10', icon: '🐚', gen: 'count-objects', params: { min: 1, max: 10 } },
          { id: 'count-type', name: 'Count & Press', icon: '🔢', gen: 'count-tap', params: { min: 1, max: 10 } },
          { id: 'one2one', name: 'One for Each', icon: '🤝', gen: 'one-to-one', params: { max: 6 } },
          { id: 'compare', name: 'More or Fewer', icon: '⚖️', gen: 'compare-groups', params: { max: 10 } },
          { id: 'shapes', name: 'Shape Spotting', icon: '🔷', gen: 'shape-id', params: { count: 6 } },
          { id: 'patterns', name: 'Pattern Magic', icon: '🎨', gen: 'pattern-next', params: { symbols: 2 } },
          { id: 'trace-num', name: 'Number Tracing', icon: '✍️', gen: 'trace-number', params: { min: 0, max: 9 } },
          { id: 'bonds10', name: 'Make 10', icon: '🧩', gen: 'decompose-10', params: {} }
        ]
      },
      {
        id: 'm-1', grade: '1', name: 'Number Harbor', emoji: '⛵', tint: '#5fb0f2', audio: 'full',
        skills: [
          { id: 'read20', name: 'Numbers to 20', icon: '🎯', gen: 'read-number', params: { min: 10, max: 20 } },
          { id: 'count20', name: 'Counting to 20', icon: '🐟', gen: 'count-tap', params: { min: 10, max: 20 } },
          { id: 'add10', name: 'Adding to 10', icon: '➕', gen: 'add-within', params: { max: 10 } },
          { id: 'add20', name: 'Adding to 20', icon: '🚀', gen: 'add-within', params: { max: 20 } },
          { id: 'sub10', name: 'Taking Away', icon: '➖', gen: 'sub-within', params: { max: 10 } },
          { id: 'sub20', name: 'Subtract to 20', icon: '🌊', gen: 'sub-within', params: { max: 20 } },
          { id: 'equal', name: 'Balance It', icon: '⚖️', gen: 'equality-balance', params: { max: 10 } },
          { id: 'missing', name: 'Mystery Number', icon: '🕵️', gen: 'missing-number-eq', params: { max: 20 } },
          { id: 'patterns1', name: 'Pattern Builder', icon: '🧱', gen: 'build-pattern', params: {} },
          { id: 'measure', name: 'Big & Small', icon: '📏', gen: 'measure-compare', params: {} }
        ]
      },
      {
        id: 'm-2', grade: '2', name: 'Hundred Hills', emoji: '⛰️', tint: '#9b8cff', audio: 'full',
        skills: [
          { id: 'pv100', name: 'Tens & Ones', icon: '🏗️', gen: 'place-value', params: { max: 99 } },
          { id: 'cmp100', name: 'Greater or Less', icon: '🐊', gen: 'compare-numbers', params: { max: 100 } },
          { id: 'add100', name: 'Adding to 100', icon: '🎈', gen: 'add-within', params: { max: 100 } },
          { id: 'sub100', name: 'Subtracting to 100', icon: '🪂', gen: 'sub-within', params: { max: 100 } },
          { id: 'skip', name: 'Skip Counting', icon: '🦘', gen: 'skip-count', params: { steps: [2, 5, 10] } },
          { id: 'evenodd', name: 'Even & Odd', icon: '👯', gen: 'even-odd', params: { max: 30 } },
          { id: 'graphs', name: 'Graph Reading', icon: '📊', gen: 'read-bargraph', params: {} }
        ]
      },
      {
        id: 'm-3', grade: '3', name: 'Times Grove', emoji: '🌲', tint: '#57b884', audio: 'partial',
        skills: [
          { id: 'pv1000', name: 'Numbers to 1000', icon: '🏰', gen: 'place-value', params: { max: 999 } },
          { id: 'expand', name: 'Number Builder', icon: '🧱', gen: 'expanded-form', params: { min: 100, max: 999 } },
          { id: 'mult5', name: 'Groups & Times', icon: '✖️', gen: 'mult-groups', params: { max: 5 } },
          { id: 'div5', name: 'Fair Sharing', icon: '🍕', gen: 'div-sharing', params: { max: 5 } },
          { id: 'frac', name: 'Fraction Pieces', icon: '🍰', gen: 'fraction-identify', params: { dens: [2, 3, 4] } },
          { id: 'time', name: 'Clock Reading', icon: '🕒', gen: 'time-read', params: { precision: 1 } },
          { id: 'perim', name: 'Perimeter Patrol', icon: '🚧', gen: 'perimeter', params: { max: 9 } }
        ]
      },
      {
        id: 'm-4', grade: '4', name: 'Decimal Desert', emoji: '🏜️', tint: '#e8a13c', audio: 'partial',
        skills: [
          { id: 'pv10000', name: 'Numbers to 10 000', icon: '🐪', gen: 'place-value', params: { max: 9999 } },
          { id: 'round', name: 'Rounding Dunes', icon: '🌀', gen: 'round-number', params: { to: [10, 100] } },
          { id: 'multf', name: 'Times Tables', icon: '⚡', gen: 'mult-facts', params: { max: 10 } },
          { id: 'divf', name: 'Division Facts', icon: '💎', gen: 'div-facts', params: { max: 10 } },
          { id: 'dec', name: 'Decimal Land', icon: '🔟', gen: 'decimal-model', params: { hundredths: true } },
          { id: 'area', name: 'Area Architect', icon: '🏗️', gen: 'area-rect', params: { max: 9 } },
          { id: 'sym', name: 'Mirror Shapes', icon: '🪞', gen: 'symmetry', params: {} },
          { id: 'table', name: 'Data Detective', icon: '🔍', gen: 'data-table', params: {} }
        ]
      },
      {
        id: 'm-5', grade: '5', name: 'Fraction Falls', emoji: '🌊', tint: '#4ecdc4', audio: 'light',
        skills: [
          { id: 'bigops', name: 'Big Number Ops', icon: '🏋️', gen: 'multi-digit-ops', params: { kinds: ['add', 'sub', 'mult'] } },
          { id: 'equiv', name: 'Twin Fractions', icon: '👯', gen: 'equiv-fractions', params: {} },
          { id: 'dec1000', name: 'Decimal Duel', icon: '⚔️', gen: 'decimal-compare', params: { places: 3 } },
          { id: 'eq1', name: 'Solve for x', icon: '🗝️', gen: 'one-step-equation', params: { max: 12 } },
          { id: 'solids', name: '3D Objects & Nets', icon: '📦', gen: 'solids-id', params: {} },
          { id: 'prob', name: 'Chance Spinner', icon: '🎡', gen: 'probability-intro', params: {} }
        ]
      },
      {
        id: 'm-6', grade: '6', name: 'Ratio Reef', emoji: '🪸', tint: '#f26d9c', audio: 'light',
        skills: [
          { id: 'pct', name: 'Percent Power', icon: '💯', gen: 'percent-basic', params: {} },
          { id: 'int', name: 'Below Zero', icon: '🧊', gen: 'integers-intro', params: {} },
          { id: 'oops', name: 'Order of Operations', icon: '🚦', gen: 'order-ops', params: {} },
          { id: 'ratio', name: 'Ratio Recipes', icon: '🧪', gen: 'ratios', params: {} },
          { id: 'angle', name: 'Angle Hunter', icon: '📐', gen: 'angles', params: {} },
          { id: 'lgraph', name: 'Line Graphs', icon: '📈', gen: 'line-graph', params: {} }
        ]
      },
      {
        id: 'm-7', grade: '7', name: 'Integer Peaks', emoji: '🏔️', tint: '#8d7bd8', audio: 'none',
        skills: [
          { id: 'iops', name: 'Integer Ops', icon: '❄️', gen: 'integer-ops', params: {} },
          { id: 'dops', name: 'Decimal Ops', icon: '🎯', gen: 'decimal-ops', params: {} },
          { id: 'fops', name: 'Fraction Ops', icon: '🍕', gen: 'fraction-ops', params: {} },
          { id: 'eq2', name: 'Two-Step Equations', icon: '🔐', gen: 'two-step-equation', params: {} },
          { id: 'circle', name: 'Circle Math', icon: '⭕', gen: 'circle-measure', params: {} },
          { id: 'cart', name: 'Coordinate Quest', icon: '🗺️', gen: 'cartesian', params: {} },
          { id: 'stats', name: 'Mean Median Mode', icon: '📊', gen: 'central-tendency', params: {} }
        ]
      }
    ]
  },
  {
    id: 'english', name: 'Word World', emoji: '🌸', tint: '#9b8cff',
    regions: [
      {
        id: 'e-k', grade: 'K', name: 'Letter Lagoon', emoji: '🐠', tint: '#5fb0f2', audio: 'full',
        skills: [
          { id: 'lmatch', name: 'Letter Partners', icon: '🔤', gen: 'letter-match', params: {} },
          { id: 'lfind', name: 'Letter Hunt', icon: '🔎', gen: 'letter-find', params: {} },
          { id: 'lsound', name: 'Letter Sounds', icon: '🔊', gen: 'letter-sound', params: {} },
          { id: 'rhyme', name: 'Rhyme Time', icon: '🎵', gen: 'rhyme-match', params: {} },
          { id: 'ltrace', name: 'Letter Tracing', icon: '✍️', gen: 'trace-letter', params: {} },
          { id: 'listen', name: 'Story Ears', icon: '🎧', gen: 'listen-story', params: {} }
        ]
      },
      {
        id: 'e-1', grade: '1', name: 'Word Meadow', emoji: '🌼', tint: '#57b884', audio: 'full',
        skills: [
          { id: 'cvc', name: 'Sound It Out', icon: '🐱', gen: 'cvc-read', params: {} },
          { id: 'build', name: 'Word Builder', icon: '🧱', gen: 'cvc-build', params: {} },
          { id: 'sight1', name: 'Star Words', icon: '⭐', gen: 'sight-word', params: { set: 1 } },
          { id: 'spell', name: 'Spell It', icon: '⌨️', gen: 'typed-cvc', params: {} },
          { id: 'sent', name: 'First Sentences', icon: '📖', gen: 'sentence-picture', params: {} },
          { id: 'ltrace2', name: 'Small Letters', icon: '✏️', gen: 'trace-letter', params: { lower: true } },
          { id: 'caps', name: 'Capitals & Periods', icon: '🔠', gen: 'fix-sentence', params: {} }
        ]
      },
      {
        id: 'e-2', grade: '2', name: 'Story Springs', emoji: '⛲', tint: '#4ecdc4', audio: 'full',
        skills: [
          { id: 'digraph', name: 'Sound Teams', icon: '🚢', gen: 'digraph-id', params: {} },
          { id: 'sight2', name: 'Star Words 2', icon: '🌟', gen: 'sight-word', params: { set: 2 } },
          { id: 'read2', name: 'Story Reading', icon: '📚', gen: 'passage-comp', params: { grade: 2 } },
          { id: 'buildsent', name: 'Sentence Builder', icon: '🔧', gen: 'build-sentence', params: {} },
          { id: 'endmark', name: 'End Marks', icon: '❓', gen: 'end-punctuation', params: {} },
          { id: 'spell2', name: 'Word Typing', icon: '⌨️', gen: 'typed-word', params: { set: 2 } }
        ]
      },
      {
        id: 'e-3', grade: '3', name: 'Paragraph Peaks', emoji: '🗻', tint: '#e8a13c', audio: 'partial',
        skills: [
          { id: 'syll', name: 'Syllable Safari', icon: '👏', gen: 'syllables', params: {} },
          { id: 'vocab', name: 'Word Power', icon: '💪', gen: 'vocab', params: {} },
          { id: 'read3', name: 'Deep Reading', icon: '🤿', gen: 'passage-comp', params: { grade: 3 } },
          { id: 'order', name: 'Story Steps', icon: '🪜', gen: 'story-order', params: {} },
          { id: 'pos', name: 'Word Sorter', icon: '🗂️', gen: 'parts-of-speech', params: {} }
        ]
      },
      {
        id: 'e-4', grade: '4', name: 'Tale Trails', emoji: '🛤️', tint: '#f26d9c', audio: 'partial',
        skills: [
          { id: 'mainidea', name: 'Main Idea', icon: '💡', gen: 'main-idea', params: {} },
          { id: 'details', name: 'Detail Detective', icon: '🕵️', gen: 'passage-detail', params: {} },
          { id: 'dialogue', name: 'Talking Marks', icon: '💬', gen: 'dialogue-punct', params: {} },
          { id: 'affix', name: 'Word Parts', icon: '🧩', gen: 'affixes', params: {} },
          { id: 'norder', name: 'Story Shaper', icon: '🎬', gen: 'narrative-order', params: {} }
        ]
      },
      {
        id: 'e-5', grade: '5', name: 'Inference Isles', emoji: '🏝️', tint: '#8d7bd8', audio: 'light',
        skills: [
          { id: 'infer', name: 'Clue Reader', icon: '🔍', gen: 'inference', params: {} },
          { id: 'compare5', name: 'Text vs Text', icon: '🆚', gen: 'compare-texts', params: {} },
          { id: 'persuade', name: 'Persuade or Inform', icon: '📣', gen: 'persuade-inform', params: {} },
          { id: 'edit', name: 'Editor\'s Eye', icon: '✏️', gen: 'edit-error', params: {} },
          { id: 'figlang', name: 'Simile & Metaphor', icon: '🎨', gen: 'figurative', params: {} }
        ]
      },
      {
        id: 'e-6', grade: '6', name: 'Essay Expanse', emoji: '🌾', tint: '#57b884', audio: 'none',
        skills: [
          { id: 'theme', name: 'Theme Seeker', icon: '🧭', gen: 'theme', params: {} },
          { id: 'purpose', name: 'Author\'s Purpose', icon: '🎯', gen: 'authors-purpose', params: {} },
          { id: 'nonfic', name: 'Fact Finder', icon: '🔬', gen: 'nonfiction', params: {} },
          { id: 'essay', name: 'Essay Engineer', icon: '🏗️', gen: 'essay-structure', params: {} },
          { id: 'complex', name: 'Sentence Combiner', icon: '🔗', gen: 'complex-sentence', params: {} },
          { id: 'homo', name: 'Tricky Twins', icon: '👥', gen: 'homophones', params: {} }
        ]
      },
      {
        id: 'e-7', grade: '7', name: 'Analysis Atlas', emoji: '🗺️', tint: '#ff7a59', audio: 'none',
        skills: [
          { id: 'lit', name: 'Story Analyst', icon: '🎓', gen: 'literary-analysis', params: {} },
          { id: 'pov', name: 'Point of View', icon: '👁️', gen: 'point-of-view', params: {} },
          { id: 'argue', name: 'Evidence Court', icon: '⚖️', gen: 'argument-evidence', params: {} },
          { id: 'tone', name: 'Tone & Mood', icon: '🎭', gen: 'tone-mood', params: {} },
          { id: 'revise', name: 'Revision Studio', icon: '🛠️', gen: 'revision', params: {} }
        ]
      }
    ]
  }
];

/* Build runtime level lists: skill levels + Review Mix every 5th node. */
(function buildLevels() {
  CURRICULUM.forEach(world => {
    world.regions.forEach((region, rIdx) => {
      const levels = [];
      let nodeNum = 0;
      region.skills.forEach(skill => {
        nodeNum++;
        levels.push({
          id: `${region.id}-${skill.id}`,
          type: 'skill',
          name: skill.name,
          icon: skill.icon,
          gen: skill.gen,
          params: skill.params,
          region, world
        });
        // Every 5th node is a Review Mix over everything learned so far
        if (nodeNum % 4 === 0) {
          levels.push({
            id: `${region.id}-review${nodeNum}`,
            type: 'review',
            name: 'Review Mix',
            icon: '🔄',
            region, world,
            reviewUpTo: levels.length
          });
        }
      });
      region.levels = levels;
      region.worldId = world.id;
      region.index = rIdx;
    });
  });
})();

/* Question factory ------------------------------------------------------- */

const GENS = () => Object.assign({}, MG, EG);

const Quest = {
  make(gen, params) {
    const g = GENS()[gen];
    if (!g) throw new Error('Unknown generator: ' + gen);
    for (let i = 0; i < 8; i++) {
      try { const q = g(params || {}); if (q) return q; } catch (e) { /* regenerate */ }
    }
    return MG['count-objects']({ min: 1, max: 9 });
  },

  // Questions for one skill level
  forLevel(level, count) {
    return Array.from({ length: count }, () => Quest.make(level.gen, level.params));
  },

  // Pool of skills for review: earlier levels in this region + prior regions in the same world
  reviewPool(level) {
    const region = level.region, world = level.world;
    const pool = [];
    const upTo = level.reviewUpTo || region.levels.length;
    region.levels.slice(0, upTo).forEach(lv => { if (lv.type === 'skill') pool.push(lv); });
    world.regions.slice(0, region.index).forEach(r =>
      r.skills.forEach(s => pool.push({ gen: s.gen, params: s.params })));
    return pool;
  },

  forReview(level, count) {
    const pool = Quest.reviewPool(level);
    return Array.from({ length: count }, () => {
      const src = U.pick(pool);
      return Quest.make(src.gen, src.params);
    });
  },

  // Boss / Fast-Track: sample across all skills of the region.
  // Tracing skills are excluded — they auto-pass (effort, not assessment)
  // and would inflate mastery-gate scores.
  forRegion(region, count) {
    const skills = region.skills.filter(s => !s.gen.startsWith('trace'));
    const pool = skills.length ? skills : region.skills;
    const qs = [];
    for (let i = 0; i < count; i++) {
      const s = pool[i % pool.length];
      qs.push(Quest.make(s.gen, s.params));
    }
    return U.shuffle(qs);
  }
};

function findRegion(regionId) {
  for (const w of CURRICULUM) for (const r of w.regions) if (r.id === regionId) return { world: w, region: r };
  return null;
}
function findLevel(levelId) {
  for (const w of CURRICULUM) for (const r of w.regions) for (const lv of r.levels) if (lv.id === levelId) return lv;
  return null;
}
