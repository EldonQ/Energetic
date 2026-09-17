import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer } from 'vite';
import { audioManifest } from '../plugins/vite-plugin-audio-manifest.ts';
import { lrcManifest } from '../plugins/vite-plugin-lrc-manifest.ts';
import { lrcFileUrl, parseLrc } from '../src/lyrics/lrc.ts';

async function workspace(t) {
  const previous = process.cwd();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'echoes-manifest-'));
  process.chdir(root);
  t.after(async () => {
    process.chdir(previous);
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

function watcher(plugin) {
  const handlers = new Map();
  plugin.configureServer({ watcher: { add() {}, on(event, handler) { handlers.set(event, handler); } } });
  return handlers;
}

test('MP3/FLAC scan, fallback metadata, URLs, native metadata and watcher', async (t) => {
  await workspace(t);
  await fs.mkdir('public/audio', { recursive: true });
  const flac = Buffer.alloc(42);
  flac.write('fLaC', 0);
  flac[4] = 0x80;
  flac[7] = 34;
  flac.writeUInt16BE(4096, 8);
  flac.writeUInt16BE(4096, 10);
  flac.writeBigUInt64BE((44100n << 44n) | (1n << 41n) | (15n << 36n) | 44100n, 18);
  await fs.writeFile('public/audio/歌手 - 微光(Live).FLAC', flac);
  await fs.writeFile('public/audio/Archive.MP3', 'invalid fixture uses filename fallback');
  await fs.writeFile('public/audio/2026-09-16_archive.mp3', 'invalid fixture');
  await fs.writeFile('public/audio/ignored.txt', 'not audio');
  const plugin = audioManifest();
  await plugin.buildStart();
  const read = async () => JSON.parse(await fs.readFile('public/audio/manifest.json', 'utf8')).tracks;
  let tracks = await read();
  assert.equal(tracks.length, 3);
  const live = tracks.find((track) => track.title === '微光(Live)');
  assert.equal(live.artist, '歌手');
  assert.equal(live.duration, 1);
  assert.equal(live.file, `audio/${encodeURIComponent('歌手 - 微光(Live).FLAC')}`);
  const dated = tracks.find((track) => track.archiveDate);
  assert.equal(dated.title, '2026-09-16_archive');
  assert.equal(dated.artist, 'UNKNOWN ARCHIVE');
  assert.equal(dated.archiveDate, '2026.09.16');
  const events = watcher(plugin);
  await fs.writeFile('public/audio/New.flac', flac);
  await events.get('add')('public/audio/New.flac');
  assert.equal((await read()).length, 4);
  await fs.unlink('public/audio/New.flac');
  await events.get('unlink')('public/audio/New.flac');
  tracks = await read();
  assert.equal(tracks.length, 3);
  flac.writeBigUInt64BE((44100n << 44n) | (1n << 41n) | (15n << 36n) | 88200n, 18);
  await fs.writeFile('public/audio/歌手 - 微光(Live).FLAC', flac);
  await events.get('change')('public/audio/歌手 - 微光(Live).FLAC');
  assert.equal((await read()).find((track) => track.title === '微光(Live)').duration, 2);

  const comments = ['TITLE=Tagged title', 'ARTIST=Tagged artist'].map((text) => {
    const value = Buffer.from(text);
    const size = Buffer.alloc(4);
    size.writeUInt32LE(value.length);
    return Buffer.concat([size, value]);
  });
  const prefix = Buffer.alloc(8);
  prefix.writeUInt32LE(comments.length, 4);
  const payload = Buffer.concat([prefix, ...comments]);
  const header = Buffer.alloc(4);
  header[0] = 0x84;
  header.writeUIntBE(payload.length, 1, 3);
  flac[4] = 0;
  await fs.writeFile('public/audio/歌手 - 微光(Live).FLAC', Buffer.concat([flac, header, payload]));
  await events.get('change')('public/audio/歌手 - 微光(Live).FLAC');
  assert.equal((await read()).find((track) => track.title === 'Tagged title').artist, 'Tagged artist');
});

test('SongLRC emits empty index for missing directory and removed last lyric', async (t) => {
  await workspace(t);
  const plugin = lrcManifest();
  const read = async () => JSON.parse(await fs.readFile('public/SongLRC/manifest.json', 'utf8')).files;
  await plugin.buildStart();
  assert.deepEqual(await read(), []);
  await fs.writeFile('public/SongLRC/微光 - 歌手.LRC', '[00:01]Test');
  await fs.writeFile('public/SongLRC/微光 - 歌手.srt', 'not indexed');
  const events = watcher(plugin);
  await events.get('add')('public/SongLRC/微光 - 歌手.LRC');
  assert.deepEqual(await read(), ['微光 - 歌手.LRC']);
  await fs.unlink('public/SongLRC/微光 - 歌手.LRC');
  await events.get('unlink')('public/SongLRC/微光 - 歌手.LRC');
  assert.deepEqual(await read(), []);
});

for (const base of ['/', '/Energetic/']) {
  test(`lyric URLs with Chinese, spaces and commas load through Vite at ${base}`, async (t) => {
    const root = await workspace(t);
    await fs.mkdir('public/SongLRC', { recursive: true });
    const file = '微光 (Live) - Artist,Guest.lrc';
    await fs.writeFile(`public/SongLRC/${file}`, '[00:01]A small light\n[00:01]微光');
    const server = await createServer({
      configFile: false, root, base, logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0 }, plugins: [lrcManifest()],
    });
    try {
      await server.listen();
      const address = server.httpServer.address();
      const response = await fetch(`http://127.0.0.1:${address.port}${lrcFileUrl(base, file)}`);
      assert.equal(response.status, 200);
      assert.deepEqual(parseLrc(await response.text()), [{time: 1, text: 'A small light', secondaryText: '微光'}]);
    } finally {
      await server.close();
    }
  });
}
