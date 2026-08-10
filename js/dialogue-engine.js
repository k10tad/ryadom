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
    let pool = this.lines.filter(line => line.category === category && !excluded.has(line.id));
    if (tags.length) {
      const tagged = pool.filter(line => line.tags?.some(tag => tags.includes(tag)));
      if (tagged.length) pool = tagged;
    }
    if (!pool.length) pool = this.lines.filter(line => line.category === category);
    if (!pool.length) pool = this.lines;
    return pool[Math.floor(Math.random() * pool.length)] || {
      id: 'fallback', category: 'everyday', text: 'うん、ここにいるよ。'
    };
  }

  voicedLines() {
    return this.lines
      .filter(line => typeof line.audio === 'string' && line.audio.trim())
      .sort((a, b) => {
        const aNumber = Number(a.audio.match(/Alek\.(\d+)\.mp3$/i)?.[1] || 0);
        const bNumber = Number(b.audio.match(/Alek\.(\d+)\.mp3$/i)?.[1] || 0);
        return aNumber - bNumber;
      });
  }

  pickVoiced(index = 0) {
    const pool = this.voicedLines();
    if (!pool.length) return this.pick('everyday');
    const safeIndex = ((Number(index) || 0) % pool.length + pool.length) % pool.length;
    return pool[safeIndex];
  }
}
