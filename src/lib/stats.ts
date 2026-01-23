import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

export interface Stats {
  pv: number;
  uv: number;
  visitors: string[]; // Store hashed IPs or session IDs
}

export const getStats = (): Stats => {
  try {
    if (!fs.existsSync(STATS_FILE)) {
      const initialStats: Stats = { pv: 0, uv: 0, visitors: [] };
      fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2));
      return initialStats;
    }
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Stats] Error reading stats:', error);
    return { pv: 0, uv: 0, visitors: [] };
  }
};

export const recordHit = (visitorId: string): Stats => {
  try {
    const stats = getStats();
    stats.pv += 1;
    
    if (!stats.visitors.includes(visitorId)) {
      stats.visitors.push(visitorId);
      stats.uv = stats.visitors.length;
    }
    
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    return stats;
  } catch (error) {
    console.error('[Stats] Error recording hit:', error);
    return getStats();
  }
};
