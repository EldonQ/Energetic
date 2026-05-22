export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Build today's archive timestamp string like "2024.11.18 / 10:21" */
export function formatArchiveStamp(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const HH = d.getHours().toString().padStart(2, '0');
  const MM = d.getMinutes().toString().padStart(2, '0');
  return `${yyyy}.${mm}.${dd} / ${HH}:${MM}`;
}
