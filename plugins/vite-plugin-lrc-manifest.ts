import type { Plugin, ViteDevServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Auto-scan public/LRC/*.lrc and emit public/LRC/manifest.json — a plain
 * list of available lyric filenames so the client can match them against
 * track titles at runtime (a browser can't list a directory over HTTP).
 *
 * Fully optional: if public/LRC/ doesn't exist (e.g. in CI — the folder is
 * gitignored) nothing is emitted and the lyrics overlay silently disables.
 *
 * To remove the lyrics feature entirely: delete this file, the src/lyrics/
 * folder, and the two registration lines in vite.config.ts / App.tsx.
 */
export function lrcManifest(): Plugin {
  const lrcDir = path.resolve(process.cwd(), 'public/LRC');
  const outFile = path.join(lrcDir, 'manifest.json');

  async function buildManifest() {
    try {
      const files = (await fs.readdir(lrcDir))
        .filter((f) => f.toLowerCase().endsWith('.lrc'))
        .sort();
      if (!files.length) return;
      const json = JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2);
      await fs.writeFile(outFile, json, 'utf-8');
      // eslint-disable-next-line no-console
      console.log(`[lrc-manifest] wrote ${files.length} lyric files → ${path.relative(process.cwd(), outFile)}`);
    } catch {
      // Directory missing (CI / fresh clone) — lyrics simply stay off.
    }
  }

  return {
    name: 'echoes:lrc-manifest',
    async buildStart() {
      await buildManifest();
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(lrcDir);
      const onChange = (p: string) => {
        if (p.toLowerCase().endsWith('.lrc')) buildManifest();
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}
