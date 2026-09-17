import type { Plugin, ViteDevServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

// Browsers cannot list directories; an empty index also clears removed lyrics.
export function lrcManifest(): Plugin {
  const lrcDir = path.resolve(process.cwd(), 'public/SongLRC');
  const outFile = path.join(lrcDir, 'manifest.json');

  async function buildManifest() {
    try {
      await fs.mkdir(lrcDir, { recursive: true });
      const files = (await fs.readdir(lrcDir))
        .filter((f) => f.toLowerCase().endsWith('.lrc'))
        .sort();
      const json = JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, 2);
      await fs.writeFile(outFile, json, 'utf-8');
      // eslint-disable-next-line no-console
      console.log(`[lrc-manifest] wrote ${files.length} lyric files → ${path.relative(process.cwd(), outFile)}`);
    } catch (err) {
      console.error('[lrc-manifest] build failed:', err);
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
        if (p.toLowerCase().endsWith('.lrc')) return buildManifest();
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}
