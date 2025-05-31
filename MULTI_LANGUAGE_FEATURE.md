# Multi-Language Feature Documentation

## 1. Overview

The **Multi-Language** upgrade transforms the application from a Chinese-only vocabulary trainer into a flexible, polyglot platform.  
Key capabilities:

* Select any supported language at runtime (client side, no page reload).
* Generate language-specific explanations and natural-sounding speech using OpenAI Chat & TTS APIs.
* Maintain separate vocabulary lists, batch generation progress, and statistics per language.
* Preserve all existing Chinese data seamlessly.

---

## 2. Supported Languages

| Enum Code | Display Name        | Default TTS Voice | Notes |
|-----------|---------------------|-------------------|-------|
| `chinese` | Chinese (中文)       | `echo`            | Pinyin & Chinese explanation template |
| `spanish` | Spanish (Español)   | `alloy`           | Simple Spanish explanation template   |
| `french`  | French (Français)   | `alloy`           | Simple French explanation template    |
| `german`  | German (Deutsch)    | `alloy`           | Simple German explanation template    |
| `italian` | Italian (Italiano)  | `alloy`           | Simple Italian explanation template   |
| `japanese`| Japanese (日本語)    | `nova`            | Furigana support in prompt            |
| `korean`  | Korean (한국어)      | `nova`            | Simple Korean explanation template    |

Additional languages can be appended via configuration only—no core code changes required.

---

## 3. Language Selection Workflow

1. **Dropdown** (Globe icon) in the header lets users choose their target language.  
2. Selection persists in `UserSettings.currentLanguage` (localStorage).  
3. All views—word list, search, stats, playlists—filter automatically to the active language.  
4. Adding words or generating audio always uses the currently selected language unless explicitly overridden.

---

## 4. Language-Specific Configuration

Implemented in `lib/languageConfigs.ts`.

```ts
export interface LanguageConfig {
  code: Language;
  displayName: string;
  ttsVoice: string;
  systemPrompt: string;
  userPromptTemplate: string;       // {word} placeholder
  exampleFormat?: string;
}
```

### Example (Spanish)

```ts
[Language.SPANISH]: {
  code: Language.SPANISH,
  displayName: 'Spanish (Español)',
  ttsVoice: 'alloy',
  systemPrompt: 'You are a helpful Spanish tutor...',
  userPromptTemplate:
    'La palabra es "{word}". "{word}" significa... En inglés es... Por ejemplo...'
}
```

`formatPrompt()` interpolates the `{word}` placeholder before dispatching to the OpenAI Chat endpoint.

---

## 5. Data Migration & Backward Compatibility

* On first run after upgrade, any existing `Word` objects **without** `languageCode` are automatically tagged with `Language.CHINESE`.
* No schema changes to stored playlists or settings other than the new `currentLanguage` field.
* Filenames for generated audio now include the language prefix (`chinese_你好.mp3`), preventing collisions.

---

## 6. API Changes

### `/api/generate-audio` (POST)

| Field     | Type      | Required | Description                     |
|-----------|-----------|----------|---------------------------------|
| `word`    | `string`  | ✔︎        | Vocabulary item                 |
| `language`| `Language`| ✖︎ (default `chinese`) | Target language |

**Response**

```json
{
  "success": true,
  "filePath": "/audio/spanish_hola.mp3",
  "explanation": "La palabra es \"hola\"...",
  "language": "spanish"
}
```

### `/api/generate-audio-batch` (POST)

Same payload plus `words: string[]`. Streaming ND-JSON response now includes `language` on every `result` object.

_No new endpoints were added; contracts were extended for language awareness._

---

## 7. UI / UX Updates

* **Language dropdown** with globe icon.
* Dynamic placeholders: “Enter a Spanish word”, “Search Japanese words…”.
* Stats badge shows generated/total counts for the active language.
* Bulk add & “Generate All” respect current language filter.
* Audio filenames & playlist filters scoped to language.

---

## 8. Usage Examples

### Adding and Generating Spanish Words

1. Select **Spanish (Español)** from the dropdown.  
2. Type `hola` ➜ **Add**.  
3. Click **Generate** or enable **Auto-generate** beforehand.  
4. The app sends:

```json
POST /api/generate-audio
{
  "word": "hola",
  "language": "spanish"
}
```

5. After generation, play `/audio/spanish_hola.mp3`.

### Switching Languages

* Change to **Japanese**—the word list clears (Chinese & Spanish words remain stored but hidden).
* Add `こんにちは`, generate, and play audio.
* Switch back to Chinese to review existing words.

---

## 9. Technical Implementation Details

* **Type updates**  
  * `enum Language` + `languageCode` field on `Word` & `Playlist`.  
  * `UserSettings` gains `currentLanguage`.
* **Hook Enhancements** (`useWords.ts`)  
  * Migration routine, filtering helpers (`getCurrentLanguageWords`, playlists).  
  * Batch generator groups words by language and sends separate streaming requests.
* **API Layer**  
  * Both endpoints accept `language`, determine `LanguageConfig`, select voice and prompts accordingly.
  * Audio filenames prefixed with language for organization.
* **UI Layer** (`SimplifiedVocabularyApp.tsx`)  
  * Retrieves display names, renders dropdown, context-aware text, stats.
  * Filters word list & operations by `currentLanguage`.
* **Storage Keys** unchanged; language segregation handled internally.

---

## 10. Future Expansion

| Idea | Notes |
|------|-------|
| **Additional languages** | Simply append to `languageConfigs.ts`. |
| **Per-language TTS voice chooser** | Expose in settings; UI ready. |
| **Global playlists** | Cross-language playlists with mixed practice modes. |
| **Server-side caching** | Store generated audio/explanations to reduce API spend. |
| **Progress analytics** | Charts per language for spaced repetition scheduling. |
| **Mobile PWA** | Offline playback using cached MP3s segregated by language. |

---

### Contributing

Add or refine language templates in `lib/languageConfigs.ts`, test via the dropdown, and ensure prompts yield beginner-friendly explanations.

---
