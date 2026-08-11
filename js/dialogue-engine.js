const TAG_GROUPS = [
  ['lateNight', 'morning', 'day', 'evening', 'night'],
  ['weekday', 'weekend'],
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  ['living', 'bedroom'],
  ['home', 'work', 'asleep', 'shower']
].map(tags => new Set(tags));

const TAG_WEIGHTS = new Map([
  ['sunday', 6], ['monday', 6], ['tuesday', 6], ['wednesday', 6],
  ['thursday', 6], ['friday', 6], ['saturday', 6],
  ['home', 5], ['work', 5], ['asleep', 5], ['shower', 5],
  ['lateNight', 4], ['morning', 4], ['day', 4], ['evening', 4], ['night', 4],
  ['weekday', 2], ['weekend', 2],
  ['living', 1], ['bedroom', 1]
]);

const CONSTRAINED_TAGS = new Set(TAG_GROUPS.flatMap(group => [...group]));

function isCompatible(line, contextTags) {
  const lineTags = line.tags || [];
  const context = new Set(contextTags);
  return TAG_GROUPS.every(group => {
    const required = lineTags.filter(tag => group.has(tag));
    return !required.length || required.some(tag => context.has(tag));
  });
}

function matchScore(line, contextTags) {
  const context = new Set(contextTags);
  return (line.tags || []).reduce((score, tag) => score + (context.has(tag) ? (TAG_WEIGHTS.get(tag) || 1) : 0), 0);
}

function bestCompatible(lines, contextTags) {
  const compatible = lines.filter(line => isCompatible(line, contextTags));
  if (!compatible.length) return [];
  const bestScore = Math.max(...compatible.map(line => matchScore(line, contextTags)));
  return bestScore > 0 ? compatible.filter(line => matchScore(line, contextTags) === bestScore) : compatible;
}

function unconstrained(lines) {
  return lines.filter(line => !(line.tags || []).some(tag => CONSTRAINED_TAGS.has(tag)));
}

export class DialogueEngine {
  constructor(lines) { this.lines = lines; }

  static async create(path = './json/dialogues.json') {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error('Dialogue library could not be loaded');
    const data = await response.json();
    return new DialogueEngine(data.lines || []);
  }

  pick(category = 'everyday', { exclude = [], tags = [] } = {}) {
    const excluded = new Set(exclude);
    const categoryLines = this.lines.filter(line => line.category === category);
    let pool = bestCompatible(categoryLines.filter(line => !excluded.has(line.id)), tags);
    if (!pool.length && excluded.size) pool = bestCompatible(categoryLines, tags);
    if (!pool.length) pool = unconstrained(categoryLines);
    if (!pool.length) pool = unconstrained(this.lines);
    return pool[Math.floor(Math.random() * pool.length)] || {
      id: 'fallback', category: 'everyday', text: 'うん、ここにいるよ。'
    };
  }

  voicedLines({ tags = [] } = {}) {
    return this.lines
      .filter(line => typeof line.audio === 'string' && line.audio.trim())
      .filter(line => isCompatible(line, tags))
      .sort((a, b) => {
        const aNumber = Number(a.audio.match(/Alek\.(\d+)\.mp3$/i)?.[1] || 0);
        const bNumber = Number(b.audio.match(/Alek\.(\d+)\.mp3$/i)?.[1] || 0);
        return aNumber - bNumber;
      });
  }

  pickVoiced(index = 0, options = {}) {
    const pool = this.voicedLines(options);
    if (!pool.length) return this.pick('everyday', options);
    const safeIndex = ((Number(index) || 0) % pool.length + pool.length) % pool.length;
    return pool[safeIndex];
  }
}
