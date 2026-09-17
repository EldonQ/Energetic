export interface LrcLine {
  time: number;
  text: string;
  secondaryText?: string;
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const META_TAG = /\[(?:ar|ti|al|by|offset|re|ve|length):[^\]]*\]/gi;
const CREDIT_ROLE = /^(?:作词|作曲|词曲|编曲|原唱|制作人|制作协力|配唱制作|配唱编写|人声设计|音乐总监|音响总监|音乐监制|乐队队长|音乐制作助理|(?:低音)?吉他|贝斯|鼓|鼓组音频编辑|键盘|钢琴|大提琴|弦乐(?:编写)?|和[声音](?:编写)?|录音(?:师|室|工作室)?|混音(?:师|室)?|音乐混音|母带(?:制作|工程师|后期处理录音室)|后期母带处理(?:制作人|录音室|录音师)|PGM)\d*$/i;
const ENGLISH_CREDIT = /^(?:lyrics(?: by)?|compos(?:er|ed by)|arrang(?:er|ement|ed by)|producer|produced by|mixed by|mixing(?: engineer| studio)?|mastering(?: engineer| studio| producer)?|recording(?: engineer| studio)?|guitar|bass|drums|strings|background vocals?|vocal production)$/i;

function isCredit(text: string): boolean {
  const separator = text.search(/[:：]/);
  if (separator < 0) return false;
  const label = text.slice(0, separator).trim();
  if (ENGLISH_CREDIT.test(label)) return true;
  const roles = label.replace(/\s+[A-Za-z].*$/, '').split(/[\/&、]/);
  return roles.every((role) => CREDIT_ROLE.test(role.trim()));
}

export function parseLrc(raw: string): LrcLine[] {
  const cues = new Map<number, string[]>();
  for (const rawLine of raw.split(/\r?\n/)) {
    const text = rawLine.replace(TIME_TAG, '').replace(META_TAG, '').trim();
    if (!text || isCredit(text)) continue;
    TIME_TAG.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TIME_TAG.exec(rawLine)) !== null) {
      const fraction = match[3] ?? '0';
      const time = Number(match[1]) * 60 + Number(match[2]) + Number(fraction) / 10 ** fraction.length;
      const texts = cues.get(time) ?? [];
      if (!texts.includes(text)) texts.push(text);
      cues.set(time, texts);
    }
  }
  return [...cues.entries()].sort(([a], [b]) => a - b).map(([time, texts]) => {
    // Same-time translations belong to one cue; prefer the Latin-script main line.
    texts.sort((a, b) => Number(/\p{Script=Han}/u.test(a)) - Number(/\p{Script=Han}/u.test(b)));
    return texts.length > 1
      ? { time, text: texts[0], secondaryText: texts.slice(1).join('\n') }
      : { time, text: texts[0] };
  });
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function titleKey(title: string): string {
  return normalize(title
    .replace(/\s*-?\s*《[^》]+》(?:电影|电视剧).*(?:曲|歌)\s*$/, '')
    .replace(/[(（][^)）]*(?:电影|电视剧)[^)）]*[)）]/g, '')
    .replace(/live\s*版/gi, 'live'));
}

function artists(artist = ''): string[] {
  // Archive/promotional tags are not artist identities, so only the exact title can disambiguate them.
  if (/UNKNOWN ARCHIVE|工作室|榜单/i.test(artist)) return [];
  return artist.replace(/[(（][^)）]*[)）]/g, '').split(/[,，、/&;；]/).map(normalize).filter(Boolean);
}

export function matchLrcFile(track: { title: string; artist?: string }, files: string[]): string | null {
  const target = titleKey(track.title);
  if (!target) return null;
  const candidates = files.filter((file) => /\.lrc$/i.test(file)).map((file) => {
    const stem = file.replace(/\.lrc$/i, '');
    const separator = stem.lastIndexOf(' - ');
    return {
      file,
      title: titleKey(separator < 0 ? stem : stem.slice(0, separator)),
      artists: artists(separator < 0 ? '' : stem.slice(separator + 3)),
    };
  }).filter((candidate) => candidate.title === target);
  const performers = artists(track.artist);
  if (performers.length) {
    const matching = candidates.filter((candidate) => candidate.artists.some((artist) => performers.includes(artist)));
    if (matching.length) return matching.length === 1 ? matching[0].file : null;
    const unnamed = candidates.filter((candidate) => !candidate.artists.length);
    return unnamed.length === 1 ? unnamed[0].file : null;
  }
  return candidates.length === 1 ? candidates[0].file : null;
}

export function lrcFileUrl(base: string, file: string): string {
  // Vite's public lookup uses decodeURI, which leaves encoded commas intact.
  return `${base}SongLRC/${encodeURIComponent(file).replace(/%2C/g, ',')}`;
}

export function findActiveIndex(lines: LrcLine[], time: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
