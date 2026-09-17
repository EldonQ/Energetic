import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, matchLrcFile, findActiveIndex } from '../src/lyrics/lrc.ts';

test('parse milliseconds, multiple timestamps and metadata', () => {
  const lines = parseLrc('[ar:Test]\n[by:Fixture]\n[00:01.234][00:03.5]A small light\n[00:02]Another line\n[00:00.000][by:Fixture]');
  assert.deepEqual(lines, [
    { time: 1.234, text: 'A small light' },
    { time: 2, text: 'Another line' },
    { time: 3.5, text: 'A small light' },
  ]);
});

test('merge bilingual cues and discard exact duplicates', () => {
  assert.deepEqual(parseLrc('[00:05]微光\n[00:05]A small light\n[00:05]A small light'), [
    { time: 5, text: 'A small light', secondaryText: '微光' },
  ]);
});

test('filter explicit opening and closing credits without deleting lyric colons', () => {
  const credits = ['作词', '录音/混音室', '乐队队长&键盘1', '母带后期处理录音室', '后期母带处理录音师', '制作人 PRODUCER', '配唱制作 VOCAL PRODUCTION', 'Mixed by', 'PGM'];
  const raw = credits.map((role, i) => `[04:${String(i).padStart(2, '0')}]${role}: Test Person`).join('\n');
  assert.deepEqual(parseLrc(`${raw}\n[00:01]I said: wait\n[04:20]答案：向前`), [
    { time: 1, text: 'I said: wait' },
    { time: 260, text: '答案：向前' },
  ]);
});

test('match exact song and performer, normalize Live version only', () => {
  const files = ['Echo (Live版) - Artist,Guest.lrc', 'Echo - Artist.lrc', 'Echo Remix - Artist.lrc'];
  assert.equal(matchLrcFile({ title: 'Echo (Live)', artist: 'Artist' }, files), files[0]);
  assert.equal(matchLrcFile({ title: 'Echo', artist: 'Artist' }, files), files[1]);
  assert.equal(matchLrcFile({ title: 'EchoREMIX', artist: 'Artist' }, files), files[2]);
  assert.equal(matchLrcFile({ title: 'Echo Acoustic', artist: 'Artist' }, files), null);
  assert.equal(matchLrcFile({ title: 'Echo Remix', artist: 'Artist' }, [files[1]]), null);
  assert.equal(matchLrcFile({ title: 'Echo (Live)', artist: 'Artist' }, [files[1]]), null);
  assert.equal(matchLrcFile({ title: 'Echo extended', artist: 'Artist' }, files), null);
  assert.equal(matchLrcFile({ title: 'Echo', artist: 'Different' }, files), null);
});

test('ignore film annotations and promotional metadata, not real version identity', () => {
  assert.equal(matchLrcFile({ title: '微光-《虚构电影》电影片尾曲', artist: '甲' }, ['微光 - 甲.lrc']), '微光 - 甲.lrc');
  assert.equal(matchLrcFile({ title: 'Echo', artist: 'Artist(Archive)' }, ['Echo - Artist,Guest.lrc']), 'Echo - Artist,Guest.lrc');
  assert.equal(matchLrcFile({ title: '微光', artist: '调音工作室—热门榜单' }, ['微光 - 甲.lrc']), '微光 - 甲.lrc');
});

test('ambiguous, absent and empty indexes do not guess matches', () => {
  assert.equal(matchLrcFile({ title: 'Echo' }, ['Echo - A.lrc', 'Echo - B.lrc']), null);
  assert.equal(matchLrcFile({ title: 'Echo', artist: 'B' }, ['Echo - A.lrc', 'Echo - B.lrc']), 'Echo - B.lrc');
  assert.equal(matchLrcFile({ title: 'Echo' }, ['Echo.srt']), null);
  assert.equal(matchLrcFile({ title: 'Echo' }, []), null);
  assert.equal(matchLrcFile({ title: '' }, ['Echo.lrc']), null);
});

test('active cue uses exact boundary and supports seeking in both directions', () => {
  const lines = parseLrc('[00:02]First\n[00:04]Second');
  assert.equal(findActiveIndex(lines, 1.999), -1);
  assert.equal(findActiveIndex(lines, 2), 0);
  assert.equal(findActiveIndex(lines, 4), 1);
  assert.equal(findActiveIndex(lines, 3), 0);
  assert.equal(findActiveIndex([], 100), -1);
});
