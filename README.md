# Chinese Vocabulary Learning App

A proof-of-concept (PoC) web application that helps you **add Chinese words**, automatically **generate easy-to-understand explanations + TTS audio with OpenAI**, and **listen back through playlists** – all from an intuitive UI built with **Next.js 15, TypeScript and shadcn/ui**.

---

## ✨ Features

| Category | Highlights |
|----------|------------|
| Vocabulary | • Add single words or bulk paste a list<br>• Local persistence with `localStorage` |
| Audio Generation | • One-click TTS for a word<br>• Batch generation with live progress streaming |
| Study Playlists | • Create playlists, reorder & loop<br>• In-browser audio player with volume, mute, repeat, progress bar |
| UX / UI | • shadcn/ui components (New-York style)<br>• Responsive layout, light/dark ready |
| Offline Assets | • Generated `.mp3` files stored under `public/audio` and served statically – no cloud storage required for the PoC |

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone <your-fork-url> language-learning-app
cd language-learning-app
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` at project root:

```
# .env.local
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_CHAT_MODEL=gpt-4-turbo-preview   # optional override
OPENAI_TTS_MODEL=tts-1                  # optional override
OPENAI_TTS_VOICE=echo                   # optional override
```

> **NOTE**: Only `OPENAI_API_KEY` is mandatory. The rest fall back to sensible defaults.

### 3. Run the Dev Server

```bash
npm run dev
# open http://localhost:3000
```

---

## 🛠️ Usage Guide

1. **Manage Words** (default tab)  
   • Type a word and hit **Add** or paste many words via **Bulk Add**.  
   • Select one or many words and press **Generate Selected** to call the batch endpoint.  
   • Status badges show `Pending → Generating → Complete / Error`.  
   • Click the 🔊 icon to preview an individual `.mp3`.

2. **Audio Player** tab  
   • Pick a playlist (a default playlist is auto-created with all completed words).  
   • Controls: Play/Pause, Previous/Next, Mute, Loop, Volume slider, Auto-play toggle.  
   • Click a list item to jump to that word; **View Explanation** to read the generated text.

All data (word list, playlists, settings) lives in `localStorage`, so your progress survives refreshes.

---

## 🏗️ Technical Architecture

```
Next.js App (App Router, React 19, TS)
│
├── UI (shadcn/ui components)
│    ├─ WordManager.tsx
│    └─ AudioPlayer.tsx
│
├── Hooks
│    ├─ useLocalStorage.ts  (generic persistence)
│    └─ useWords.ts         (state + API calls + progress stream)
│
├── API Routes  (Edge/server)
│    ├─ /api/generate-audio        (single word)
│    └─ /api/generate-audio-batch  (multiple words, text/event-stream)
│
├── public/audio/  (static mp3 output)
└── .env.local      (OpenAI credentials)
```

Key points

* **OpenAI SDK** used server-side only – secrets never hit the browser.  
* **Streaming**: Batch endpoint returns a newline-delimited JSON stream so progress can update in real time.  
* **Local FS**: On Vercel or Netlify the file system is ephemeral – for production you’d switch to object storage.

---

## 📑 API Documentation

### POST `/api/generate-audio`

| Body (JSON) | Type   | Required | Description                               |
|-------------|--------|----------|-------------------------------------------|
| `word`      | string | ✅        | Chinese word to process                   |

**Response 200**

```json
{
  "success": true,
  "filePath": "/audio/喝.mp3",
  "explanation": "这个词是\"喝\"。“喝”的意思是……"
}
```

### POST `/api/generate-audio-batch`

| Body (JSON) | Type       | Required |
|-------------|------------|----------|
| `words`     | string[ ]  | ✅        |

Returns **newline-delimited JSON** chunks:

* `progress` – `{ type:"progress", processed, total, currentWord }`
* `result`   – `{ type:"result", processed, total, result:{...} }`
* `complete` – `{ type:"complete", total, allResults:[...] }`
* `error`    – `{ type:"error", error }`

Use a streaming reader (`response.body.getReader()`) as implemented in `hooks/useWords.ts`.

---

## 🩹 Troubleshooting

| Symptom | Possible Cause / Fix |
|---------|----------------------|
| `500 OpenAI API key is not configured` | `.env.local` missing or variable name typo. |
| Generation stuck at **Pending** | Check browser console & server logs – network error or OpenAI quota exceeded. |
| `ERR_OSSL_EVP_UNSUPPORTED` on `npm install` (Mac) | Install Node 18+ via `brew` or nvm, ensure OpenSSL 3. |
| Audio not playing in production | On serverless hosts the mp3 may not persist; deploy with object storage or run on a VM/local. |
| “Some packages may fail to install due to peer dependency issues” | shadcn/ui CLI prompt – choose **Use --force** when using React 19. |

---

## 🔭 Future Improvements

* Authentication + multi-user accounts  
* Database persistence (e.g. Postgres + Prisma)  
* Cloud storage (S3/Vercel Blob) for generated audio  
* Scheduler for spaced-repetition playback  
* Add pinyin auto-generation & tone colors  
* Rich markdown explanations with images/examples  
* Mobile-first redesign & PWA offline support  
* i18n support for languages other than English  
* Testing suite (Vitest + Playwright) and CI/CD pipeline

---

Happy learning 🧠🎧🇨🇳
