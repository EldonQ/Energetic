/**
 * Track manifest entry produced by vite-plugin-audio-manifest.
 */
export interface Track {
  id: string;
  file: string;
  title: string;
  artist: string;
  duration: number; // seconds
  year?: number;
  archiveDate?: string; // YYYY.MM.DD
}

export interface Manifest {
  generatedAt: string;
  tracks: Track[];
}
