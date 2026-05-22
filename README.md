# Echoes Art Museum

> Drop your MP3s, get an audio-reactive WebGL gallery in dark museum aesthetics.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/EldonQ/Energetic)
[![Deploy to GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-181717?logo=github)](https://github.com/EldonQ/Energetic/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

A desktop music-visualization web app inspired by curated-archive aesthetics:
five hand-tuned audio-reactive scenes, museum-style typography, EN/中 toggle,
and a real-time intensity selector. Built on Vite + React 18 + Three.js
(`@react-three/fiber`) with a custom envelope/onset/beat audio analyser.

---

### 中文 TL;DR

深色极简的本地音乐可视化网页。把 MP3 拖进 `public/audio/`，Vite 插件自动扫描
生成播放列表 + ID3 元数据，5 套可视化（晶体 / 数据壁 / 液态金属 / 点云断层 /
山脊飞行）按节拍、能量、低中高频实时响应。右上角可切换 **氛围 / 律动** 两档
全局律动强度，以及中/英文界面。本仓库无内置 MP3，请自行准备版权允许的素材。

---

## ✨ Visualizations

| # | Name | Audio reaction | Inspiration |
|---|------|----------------|-------------|
| **I** | **Crystal** | Vertex displacement on bass/mid/treble; beat triggers scale punch + Fresnel rim. | Generative crystal sculpture |
| **II** | **Monolith** | Per-bar fast-attack / slow-release envelopes on a 32-band log spectrum; beat flashes brightness. | Ryoji Ikeda's data-monolith works |
| **III** | **Mercury** | SDF-raymarched smooth-blended spheres; bass stretches orbits, beat snaps camera in. | Liquid metal / mercury renderings |
| **IV** | **Strata** | GPU point cloud bucketed into horizontal layers; bottom layers ride bass, top layers shimmer on treble; beat sweeps a vertical scan line. | Quayola "Strata" |
| **V** | **Heightfield** | Raymarched fbm mountains, forward flying camera; bass lifts the ridges, treble sparkles slopes, beat fires lightning across the sky. | Inigo Quilez "Elevated" |

## 🎚 Global intensity tiers

A two-button toggle in the header re-scales every viz's reactivity globally
without touching per-scene parameter sliders:

- **Ambient** — softer envelopes, fewer beat events; suited to classical /
  ambient material.
- **Pulse** *(default)* — engineer-tuned identity transform; matches the
  analyser's raw, punchy output.

Implementation: `src/audio/analyzer.ts` → `applyIntensity()`. Profiles run as a
post-process on `AudioFeatures` each frame, so the adaptive peak tracker still
sees the un-scaled signal.

## 🚀 Quick start

```bash
git clone https://github.com/EldonQ/Energetic.git
cd Energetic
npm install

# 1) Drop any *.mp3 files into public/audio/
#    (the Vite plugin scans them and emits manifest.json with ID3 tags)
# 2) Run the dev server
npm run dev
# → http://localhost:5173
```

## 📦 Production build

```bash
npm run build        # tsc + vite build → dist/
npm run preview      # serve dist/ on http://localhost:4173
```

## ☁️ Deployment

Two ready-to-use paths — pick whichever you prefer. Both produce a static SPA
out of `dist/`.

### 1. Vercel (one-click)

Click the **Deploy with Vercel** badge at the top. Vercel will:

1. Fork the repo into your account
2. Detect the Vite preset (`vercel.json` is committed) and run `npm install &&
   npm run build`
3. Serve `dist/` at `https://<your-project>.vercel.app`
4. Add an entry to your repo's **Deployments** tab via the Vercel GitHub bot
5. Auto-deploy on every push thereafter

### 2. GitHub Pages (via CI)

A workflow at `.github/workflows/deploy-pages.yml` builds and deploys to the
`github-pages` environment on every push to `main`. Steps after fork:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Push any commit to `main` (or trigger the workflow manually)
3. The workflow appears under **Actions** and creates a `github-pages` entry
   in **Deployments**
4. Site is served at `https://<owner>.github.io/Energetic/`

The build sets `VITE_BASE=/Energetic/` so all asset URLs (including the audio
manifest) work under the subpath.

### 3. Anything else

`dist/` is a vanilla static SPA — Netlify, Cloudflare Pages, S3 + CloudFront,
or any static host work the same way. Set `VITE_BASE` if you serve from a
non-root path.

## 🎵 About the MP3s

This repo does **not** include music files (see `.gitignore`). After cloning,
drop your own `.mp3`s into `public/audio/` — they're scanned at build time by
`plugins/vite-plugin-audio-manifest.ts`, which uses
[`music-metadata`](https://github.com/borewit/music-metadata) to read ID3 tags
into a `manifest.json` consumed by the player. Filenames of the form
`YYYY-MM-DD_*.mp3` populate the "archive date" field.

> For deployed demos you'll want a couple of short, royalty-free tracks
> committed to a fork of this repo so visitors actually hear something.
> Don't push tracks you don't have rights to redistribute.

## 🏗 Stack

- **Vite 5** + **React 18** + **TypeScript** — build & framework
- **Three.js r169** via **@react-three/fiber** + **@react-three/drei**
- **@react-three/postprocessing** — Bloom + vignette
- **Web Audio API** — native `AnalyserNode` (fftSize 1024, 512 bins)
- **Zustand** + persist — UI / player / viz state
- **Tailwind CSS** — minimal museum aesthetic
- **react-i18next** — bilingual (EN / 中)
- **music-metadata** — build-time ID3 parsing (Node-side)

## 🔧 Project layout

```
src/
├── audio/                 AudioEngine, analyzer, hooks
│   ├── analyzer.ts        envelope-followed bands, onset/beat, log spectrum
│   └── useAudioData.ts    shared 60-fps feature refs (no React re-renders)
├── visualizations/        each viz is a self-contained VizModule
│   ├── crystal/   monolith/   mercury/   strata/   heightfield/
│   ├── types.ts           VizModule, ParamSchema
│   └── index.ts           registry → drives the I/II/III/IV/V switcher
├── components/
│   ├── layout/            Header / footer / IntensityToggle / LanguageToggle
│   ├── controls/          VizSwitcher, ParamPanel (auto-generated from schemas)
│   ├── visualizer/        Scene canvas + ambient particles + post-FX
│   ├── playlist/  hud/  ui/
├── store/                 zustand stores: player / ui / viz (with persist)
├── i18n/                  locales/{en,zh}.json
plugins/
└── vite-plugin-audio-manifest.ts   scans public/audio/, emits manifest.json
.github/workflows/
└── deploy-pages.yml       Pages CI (populates GitHub Deployments)
vite.config.ts             base: VITE_BASE ?? '/'
vercel.json                Vercel preset
```

## 🧪 Adding your own visualization

1. `src/visualizations/my-viz/`
2. Implement a `VizModule<MyParams>` (id, numeral, name/description, schema,
   defaults, R3F `Component`)
3. Add the import to `src/visualizations/index.ts` and append it to
   `VIZ_MODULES`
4. The switcher and parameter panel pick it up automatically

The component should read `sharedFeaturesRef.current` inside `useFrame` for
per-frame audio features. `useUIStore((s) => s.reducedMotion)` flag lets the
viz freeze motion for accessibility.

## ⌨️ Keyboard

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `1` … `5` | Switch to viz I through V |
| `P` | Toggle parameter panel |

## ⚠️ Notes & limitations

- Desktop Chrome / Edge / Firefox only. iOS Safari is not adapted (autoplay +
  `webkitAudioContext` quirks).
- The `AudioContext` is created on the *first* play click (browser requires a
  user gesture).
- Heightfield (V) uses a 110-step raymarch — older integrated GPUs may need
  to dial down `terrainScale` in the parameter panel.

## 📄 License

MIT. See [LICENSE](LICENSE) if present.
