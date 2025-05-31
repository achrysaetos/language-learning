import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Word, 
  WordStatus, 
  Playlist, 
  GenerationProgress, 
  StorageKeys,
  WordProcessingResult,
  ProgressUpdate
} from '@/lib/types';
import { useLocalStorage } from './useLocalStorage';

/**
 * Custom hook for managing words, playlists, and audio generation
 * Provides CRUD operations and handles API interactions
 */
export function useWords() {
  // Persist words and playlists in localStorage
  const [words, setWords] = useLocalStorage<Record<string, Word>>(StorageKeys.WORDS, {});
  const [playlists, setPlaylists] = useLocalStorage<Record<string, Playlist>>(StorageKeys.PLAYLISTS, {});
  
  // Track generation progress
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });
  
  // Track if a generation is in progress
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Word CRUD operations
  const addWord = useCallback((word: string, pinyin?: string) => {
    const id = word; // Use the word itself as the ID for simplicity
    
    setWords(prev => {
      // Skip if word already exists
      if (prev[id]) return prev;
      
      return {
        ...prev,
        [id]: {
          id,
          word,
          pinyin,
          status: WordStatus.IDLE,
          createdAt: new Date(),
          playCount: 0
        }
      };
    });
    
    return id;
  }, [setWords]);
  
  const updateWord = useCallback((id: string, updates: Partial<Omit<Word, 'id'>>) => {
    setWords(prev => {
      if (!prev[id]) return prev;
      
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...updates
        }
      };
    });
  }, [setWords]);
  
  const deleteWord = useCallback((id: string) => {
    setWords(prev => {
      const newWords = { ...prev };
      delete newWords[id];
      return newWords;
    });
    
    // Also remove from all playlists
    setPlaylists(prev => {
      const updatedPlaylists: Record<string, Playlist> = {};
      
      for (const playlistId in prev) {
        updatedPlaylists[playlistId] = {
          ...prev[playlistId],
          words: prev[playlistId].words.filter(wordId => wordId !== id)
        };
      }
      
      return updatedPlaylists;
    });
  }, [setWords, setPlaylists]);
  
  const getWordById = useCallback((id: string) => {
    return words[id];
  }, [words]);
  
  const getAllWords = useCallback(() => {
    return Object.values(words);
  }, [words]);
  
  // Playlist CRUD operations
  const createPlaylist = useCallback((name: string, description?: string) => {
    const id = uuidv4();
    
    setPlaylists(prev => ({
      ...prev,
      [id]: {
        id,
        name,
        description,
        words: [],
        createdAt: new Date(),
        playCount: 0
      }
    }));
    
    return id;
  }, [setPlaylists]);
  
  const updatePlaylist = useCallback((id: string, updates: Partial<Omit<Playlist, 'id'>>) => {
    setPlaylists(prev => {
      if (!prev[id]) return prev;
      
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...updates
        }
      };
    });
  }, [setPlaylists]);
  
  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => {
      const newPlaylists = { ...prev };
      delete newPlaylists[id];
      return newPlaylists;
    });
  }, [setPlaylists]);
  
  const getPlaylistById = useCallback((id: string) => {
    return playlists[id];
  }, [playlists]);
  
  const getAllPlaylists = useCallback(() => {
    return Object.values(playlists);
  }, [playlists]);
  
  const addWordToPlaylist = useCallback((playlistId: string, wordId: string) => {
    setPlaylists(prev => {
      if (!prev[playlistId]) return prev;
      
      // Skip if word already in playlist
      if (prev[playlistId].words.includes(wordId)) return prev;
      
      return {
        ...prev,
        [playlistId]: {
          ...prev[playlistId],
          words: [...prev[playlistId].words, wordId]
        }
      };
    });
  }, [setPlaylists]);
  
  const removeWordFromPlaylist = useCallback((playlistId: string, wordId: string) => {
    setPlaylists(prev => {
      if (!prev[playlistId]) return prev;
      
      return {
        ...prev,
        [playlistId]: {
          ...prev[playlistId],
          words: prev[playlistId].words.filter(id => id !== wordId)
        }
      };
    });
  }, [setPlaylists]);
  
  // Audio generation functions
  const generateAudio = useCallback(async (wordId: string) => {
    const word = words[wordId];
    if (!word) throw new Error(`Word not found: ${wordId}`);
    
    try {
      // Update status to generating
      updateWord(wordId, { status: WordStatus.GENERATING });
      
      // Call API to generate audio
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.word })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate audio');
      }
      
      const data = await response.json();
      
      // Update word with audio path and explanation
      updateWord(wordId, {
        audioPath: data.filePath,
        explanation: data.explanation,
        status: WordStatus.COMPLETE,
        lastGenerated: new Date()
      });
      
      return data;
    } catch (error) {
      // Update status to error
      updateWord(wordId, {
        status: WordStatus.ERROR,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }, [words, updateWord]);
  
  const generateAudioBatch = useCallback(async (wordIds: string[]) => {
    if (isGenerating) {
      throw new Error('Another generation is already in progress');
    }
    
    if (wordIds.length === 0) {
      throw new Error('No words selected for generation');
    }
    
    // Filter out invalid word IDs
    const validWordIds = wordIds.filter(id => words[id]);
    if (validWordIds.length === 0) {
      throw new Error('No valid words selected for generation');
    }
    
    // Get the actual words from the IDs
    const wordsToGenerate = validWordIds.map(id => words[id].word);
    
    try {
      setIsGenerating(true);
      
      // Initialize progress
      setGenerationProgress({
        total: validWordIds.length,
        processed: 0,
        successful: 0,
        failed: 0,
        startTime: new Date()
      });
      
      // Update all selected words to pending status
      validWordIds.forEach(id => {
        updateWord(id, { status: WordStatus.PENDING });
      });
      
      // Call batch API with streaming response
      const response = await fetch('/api/generate-audio-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsToGenerate })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }
      
      // Read chunks of data as they arrive
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON objects from the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const update = JSON.parse(line) as ProgressUpdate;
            
            if (update.type === 'progress') {
              // Update the current word being processed
              setGenerationProgress(prev => ({
                ...prev,
                processed: update.processed,
                currentWord: update.currentWord
              }));
              
              // Update the word status to generating
              if (update.currentWord) {
                const wordId = validWordIds[update.processed];
                if (wordId) {
                  updateWord(wordId, { status: WordStatus.GENERATING });
                }
              }
            }
            else if (update.type === 'result' && update.result) {
              // Process individual word result
              const { word, success, filePath, explanation, error } = update.result;
              const wordId = validWordIds[update.processed - 1];
              
              if (wordId) {
                if (success) {
                  updateWord(wordId, {
                    audioPath: filePath,
                    explanation,
                    status: WordStatus.COMPLETE,
                    lastGenerated: new Date()
                  });
                  
                  setGenerationProgress(prev => ({
                    ...prev,
                    processed: update.processed,
                    successful: prev.successful + 1
                  }));
                } else {
                  updateWord(wordId, {
                    status: WordStatus.ERROR,
                    errorMessage: error
                  });
                  
                  setGenerationProgress(prev => ({
                    ...prev,
                    processed: update.processed,
                    failed: prev.failed + 1
                  }));
                }
              }
            }
            else if (update.type === 'complete') {
              // All words processed
              setGenerationProgress(prev => ({
                ...prev,
                processed: update.total,
                total: update.total
              }));
            }
            else if (update.type === 'error') {
              throw new Error(update.error || 'Unknown error in batch processing');
            }
          } catch (error) {
            console.error('Error parsing streaming response:', error, line);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Batch generation error:', error);
      
      // Update all pending words to error status
      validWordIds.forEach(id => {
        const word = words[id];
        if (word.status === WordStatus.PENDING || word.status === WordStatus.GENERATING) {
          updateWord(id, {
            status: WordStatus.ERROR,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [words, updateWord, isGenerating]);
  
  // Calculate estimated time remaining
  useEffect(() => {
    if (isGenerating && generationProgress.startTime && generationProgress.processed > 0) {
      const elapsedMs = Date.now() - generationProgress.startTime.getTime();
      const msPerWord = elapsedMs / generationProgress.processed;
      const wordsRemaining = generationProgress.total - generationProgress.processed;
      const estimatedTimeRemaining = (msPerWord * wordsRemaining) / 1000; // in seconds
      
      setGenerationProgress(prev => ({
        ...prev,
        estimatedTimeRemaining: Math.round(estimatedTimeRemaining)
      }));
    }
  }, [isGenerating, generationProgress]);
  
  // Reset progress when generation completes
  useEffect(() => {
    if (!isGenerating && generationProgress.processed > 0) {
      // Keep the progress visible for a short time before resetting
      const timer = setTimeout(() => {
        setGenerationProgress({
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isGenerating, generationProgress.processed]);
  
  // Return the API
  return {
    // Word operations
    words: getAllWords(),
    wordsMap: words,
    addWord,
    updateWord,
    deleteWord,
    getWordById,
    
    // Playlist operations
    playlists: getAllPlaylists(),
    playlistsMap: playlists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylistById,
    addWordToPlaylist,
    removeWordFromPlaylist,
    
    // Audio generation
    generateAudio,
    generateAudioBatch,
    isGenerating,
    generationProgress,
    
    // Helper computed properties
    wordCount: Object.keys(words).length,
    playlistCount: Object.keys(playlists).length,
    generatedWordCount: Object.values(words).filter(w => w.status === WordStatus.COMPLETE).length,
    pendingWordCount: Object.values(words).filter(w => 
      w.status === WordStatus.IDLE || 
      w.status === WordStatus.PENDING
    ).length,
    errorWordCount: Object.values(words).filter(w => w.status === WordStatus.ERROR).length
  };
}
