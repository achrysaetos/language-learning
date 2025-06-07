# Language Learning App

A simple, intuitive vocabulary learning app with AI-generated audio explanations.

## Features

- **Multiple Languages**: Support for Chinese, Spanish, French, German, Italian, Japanese, and Korean
- **AI Audio Generation**: Automatic or manual audio generation with explanations
- **Playback Modes**: Sequential, shuffle, or single word playback
- **Practice Mode**: Listen and type what you hear
- **Auto-save**: All data saved locally in your browser

## How to Use

1. **Select Language**: Choose from the dropdown menu
2. **Add Words**: Type a word and press Enter
3. **Toggle Auto-generate**: Turn on/off automatic audio generation
4. **Play Audio**: Click speaker icon on any word
5. **Playback Options**: 
   - Play All: Start playing all words
   - Click mode button to switch between Sequential/Shuffle/Single
6. **Practice**: Test yourself by listening and typing

## Setup

```bash
# Install dependencies
npm install

# Add your OpenAI API key to .env.local
OPENAI_API_KEY=your-api-key-here

# Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start learning!