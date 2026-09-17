import type { Plugin, ViteDevServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const AUDIO_EXTENSION = /\.(mp3|flac)$/i;

/**
 * Auto-scan public/audio MP3/FLAC files and emit public/audio/manifest.json
 * Watches the folder during dev; rebuilds on add/remove.
 *
 * Tries to read ID3 tags via `music-metadata` (optional dep);
 * falls back to filename-based metadata if unavailable or parse fails.
 */
export function audioManifest(): Plugin {
  const audioDir = path.resolve(process.cwd(), 'public/audio');
  const outFile = path.join(audioDir, 'manifest.json');

  async function buildManifest() {
    try {
      await fs.mkdir(audioDir, { recursive: true });
      const files = (await fs.readdir(audioDir))
        .filter((f) => AUDIO_EXTENSION.test(f))
        .sort();

      // Try dynamic import; if it fails we fall back to filename-only metadata.
      let parseFile: ((p: string) => Promise<any>) | null = null;
      try {
        const mm = await import('music-metadata');
        parseFile = mm.parseFile;
      } catch {
        parseFile = null;
      }

      const tracks = await Promise.all(
        files.map(async (file, i) => {
          const stem = file.replace(AUDIO_EXTENSION, '');
          const parts = /^\d{4}[-_]\d{2}[-_]\d{2}/.test(stem)
            ? null
            : stem.match(/^(.+?)\s*-\s*(.+)$/);
          let title = parts?.[2].trim() ?? stem;
          let artist = parts?.[1].trim() ?? 'UNKNOWN ARCHIVE';
          let duration = 0;
          let year: number | undefined;

          if (parseFile) {
            try {
              const meta = await parseFile(path.join(audioDir, file));
              title = meta?.common?.title?.trim() || title;
              artist = meta?.common?.artist?.trim() || artist;
              duration = meta?.format?.duration ?? 0;
              year = meta?.common?.year;
            } catch {
              /* fall through */
            }
          }

          // try infer date from filename prefix YYYY_MM_DD or YYYY-MM-DD
          const dateMatch = file.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
          const archiveDate = dateMatch
            ? `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`
            : undefined;

          return {
            id: String(i + 1).padStart(3, '0'),
            // Relative path — the consumer prefixes import.meta.env.BASE_URL
            // so the same manifest works under any deploy base
            // (e.g. "/" on Vercel, "/Energetic/" on GitHub Pages).
            file: `audio/${encodeURIComponent(file).replace(/%2C/g, ',')}`,
            title,
            artist,
            duration,
            year,
            archiveDate,
          };
        }),
      );

      const json = JSON.stringify({ generatedAt: new Date().toISOString(), tracks }, null, 2);
      await fs.writeFile(outFile, json, 'utf-8');
      // eslint-disable-next-line no-console
      console.log(`[audio-manifest] wrote ${tracks.length} tracks → ${path.relative(process.cwd(), outFile)}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[audio-manifest] build failed:', err);
    }
  }

  return {
    name: 'echoes:audio-manifest',
    async buildStart() {
      await buildManifest();
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(audioDir);
      const onChange = (p: string) => {
        if (AUDIO_EXTENSION.test(p)) return buildManifest();
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}
