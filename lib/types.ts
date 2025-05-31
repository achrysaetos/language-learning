/**
 * Core data types for the language learning application
 */

// Word status during generation process
export enum WordStatus {
  IDLE = 'idle',           // Not yet processed
  PENDING = 'pending',     // Queued for processing
  GENERATING = 'generating', // Currently being processed
  COMPLETE = 'complete',   // Successfully generated
  ERROR = 'error'          // Failed to generate
}

// Word object representing a vocabulary item
export interface Word {
  id: string;              // Unique identifier (can be the word itself or a UUID)
  word: string;            // The Chinese word/character
  pinyin?: string;         // Optional pinyin pronunciation
  explanation?: string;    // Explanation and example sentences
  translation?: string;    // English translation
  audioPath?: string;      // Path to the audio file
  status: WordStatus;      // Current generation status
  errorMessage?: string;   // Error message if generation failed
  createdAt: Date;         // When the word was added
  lastGenerated?: Date;    // When audio was last generated
}

// Playlist for organizing words
export interface Playlist {
  id: string;              // Unique identifier
  name: string;            // Display name
  description?: string;    // Optional description
  words: string[];         // Array of word IDs in the playlist
  createdAt: Date;         // When the playlist was created
  lastPlayed?: Date;       // When the playlist was last played
  playCount: number;       // Number of times played
}

// Audio player state
export interface AudioPlayerState {
  isPlaying: boolean;      // Whether audio is currently playing
  currentWordIndex: number; // Index of current word in playlist
  currentPlaylistId?: string; // ID of current playlist
  volume: number;          // Playback volume (0-1)
  loop: boolean;           // Whether to loop the playlist
  shuffle: boolean;        // Whether to shuffle playback
}

// Progress tracking for batch generation
export interface GenerationProgress {
  total: number;           // Total number of words to process
  processed: number;       // Number of words processed so far
  successful: number;      // Number of successfully generated words
  failed: number;          // Number of failed generations
  currentWord?: string;    // Word currently being processed
  startTime?: Date;        // When the generation started
  estimatedTimeRemaining?: number; // Estimated seconds remaining
}

// API Request Types
export interface GenerateAudioRequest {
  word: string;
}

export interface GenerateAudioBatchRequest {
  words: string[];
}

// API Response Types
export interface GenerateAudioResponse {
  success: boolean;
  filePath?: string;
  explanation?: string;
  error?: string;
}

export interface WordProcessingResult {
  word: string;
  success: boolean;
  filePath?: string;
  explanation?: string;
  error?: string;
}

export interface ProgressUpdate {
  type: 'progress' | 'result' | 'complete' | 'error';
  processed: number;
  total: number;
  currentWord?: string;
  result?: WordProcessingResult;
  allResults?: WordProcessingResult[];
  error?: string;
}

// Local storage keys
export enum StorageKeys {
  WORDS = 'language-app-words',
  PLAYLISTS = 'language-app-playlists',
  SETTINGS = 'language-app-settings'
}

// User preferences/settings
export interface UserSettings {
  defaultVoice: string;    // Default TTS voice
  autoPlay: boolean;       // Auto-play after generation
  darkMode: boolean;       // UI theme preference
  repeatCount: number;     // How many times to repeat each word
  pauseDuration: number;   // Pause between words in seconds
}
