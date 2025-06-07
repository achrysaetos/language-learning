import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWords } from '@/hooks/useWords';
import { Word, WordStatus, Language } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Pause,
  Plus, 
  Trash, 
  Volume2,
  SkipForward,
  SkipBack,
  Sparkles,
  Globe,
  BookOpen,
  Shuffle,
  Repeat
} from 'lucide-react';
import { getLanguageDisplayNames } from '@/lib/languageConfigs';
import { cn } from '@/lib/utils';
import { SimplePractice } from './SimplePractice';

type PlayMode = 'single' | 'sequential' | 'shuffle';

export default function CleanVocabularyApp() {
  const {
    wordsMap,
    addWord,
    deleteWord,
    generateAudio,
    generateAudioBatch,
    isGenerating,
    generationProgress,
    currentLanguage,
    setCurrentLanguage,
    getCurrentLanguageWords,
    currentLanguageWordCount,
    currentLanguageGeneratedCount
  } = useWords();

  // State
  const [newWord, setNewWord] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordId, setCurrentWordId] = useState<string | null>(null);
  const [showPractice, setShowPractice] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [playMode, setPlayMode] = useState<PlayMode>('sequential');
  const [playedWords, setPlayedWords] = useState<Set<string>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current word and filtered words
  const currentWord = currentWordId ? wordsMap[currentWordId] : null;
  const words = getCurrentLanguageWords().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const wordsWithAudio = words.filter(w => w.status === WordStatus.COMPLETE);
  const languageDisplayNames = getLanguageDisplayNames();

  // Initialize audio
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', handleAudioEnded);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current.pause();
      }
    };
  }, []);

  // Handle audio ended
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    
    if (playMode === 'single') {
      // Do nothing, just stop
      return;
    }
    
    const currentIndex = wordsWithAudio.findIndex(w => w.id === currentWordId);
    
    if (playMode === 'sequential') {
      if (currentIndex < wordsWithAudio.length - 1) {
        const nextWord = wordsWithAudio[currentIndex + 1];
        setCurrentWordId(nextWord.id);
        setTimeout(() => setIsPlaying(true), 500);
      }
    } else if (playMode === 'shuffle') {
      const unplayedWords = wordsWithAudio.filter(w => !playedWords.has(w.id) && w.id !== currentWordId);
      
      if (unplayedWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * unplayedWords.length);
        const nextWord = unplayedWords[randomIndex];
        setPlayedWords(prev => new Set(prev).add(currentWordId!));
        setCurrentWordId(nextWord.id);
        setTimeout(() => setIsPlaying(true), 500);
      } else {
        // All words played, reset for next shuffle cycle
        setPlayedWords(new Set());
      }
    }
  }, [playMode, wordsWithAudio, currentWordId, playedWords]);

  // Update audio source
  useEffect(() => {
    if (currentWord?.audioPath && audioRef.current) {
      audioRef.current.src = currentWord.audioPath;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentWord, isPlaying]);

  // Add word
  const handleAddWord = useCallback(() => {
    if (!newWord.trim()) return;
    
    const wordId = addWord(newWord.trim(), currentLanguage);
    setNewWord('');
    
    // Auto-generate audio if enabled
    if (autoGenerate) {
      generateAudio(wordId).catch(console.error);
    }
    
    inputRef.current?.focus();
  }, [newWord, addWord, generateAudio, currentLanguage, autoGenerate]);

  // Generate all missing audio
  const handleGenerateAll = useCallback(() => {
    const wordsNeedingAudio = words
      .filter(w => w.status === WordStatus.IDLE || w.status === WordStatus.ERROR)
      .map(w => w.id);
    
    if (wordsNeedingAudio.length > 0) {
      generateAudioBatch(wordsNeedingAudio).catch(console.error);
    }
  }, [words, generateAudioBatch]);

  // Play controls
  const playWord = useCallback((wordId: string) => {
    if (currentWordId === wordId && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentWordId(wordId);
      setIsPlaying(true);
      setPlayedWords(new Set([wordId]));
    }
  }, [currentWordId, isPlaying]);

  const playNext = useCallback(() => {
    const currentIndex = wordsWithAudio.findIndex(w => w.id === currentWordId);
    if (currentIndex < wordsWithAudio.length - 1) {
      setCurrentWordId(wordsWithAudio[currentIndex + 1].id);
      setIsPlaying(true);
    }
  }, [currentWordId, wordsWithAudio]);

  const playPrevious = useCallback(() => {
    const currentIndex = wordsWithAudio.findIndex(w => w.id === currentWordId);
    if (currentIndex > 0) {
      setCurrentWordId(wordsWithAudio[currentIndex - 1].id);
      setIsPlaying(true);
    }
  }, [currentWordId, wordsWithAudio]);

  const playAll = useCallback(() => {
    if (wordsWithAudio.length > 0) {
      setPlayedWords(new Set());
      if (playMode === 'shuffle') {
        const randomIndex = Math.floor(Math.random() * wordsWithAudio.length);
        setCurrentWordId(wordsWithAudio[randomIndex].id);
      } else {
        setCurrentWordId(wordsWithAudio[0].id);
      }
      setIsPlaying(true);
    }
  }, [wordsWithAudio, playMode]);

  const cyclePlayMode = useCallback(() => {
    const modes: PlayMode[] = ['sequential', 'shuffle', 'single'];
    const currentIndex = modes.indexOf(playMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPlayMode(modes[nextIndex]);
  }, [playMode]);

  const getPlayModeIcon = () => {
    switch (playMode) {
      case 'shuffle': return <Shuffle className="h-4 w-4" />;
      case 'single': return <Volume2 className="h-4 w-4" />;
      default: return <Repeat className="h-4 w-4" />;
    }
  };

  const getPlayModeTooltip = () => {
    switch (playMode) {
      case 'shuffle': return 'Shuffle';
      case 'single': return 'Single';
      default: return 'Sequential';
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <audio ref={audioRef} />

      {/* Language Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <select 
            className="text-lg font-medium bg-transparent border-0 focus:outline-none"
            value={currentLanguage}
            onChange={(e) => setCurrentLanguage(e.target.value as Language)}
          >
            {Object.entries(languageDisplayNames).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm">
            <Switch
              checked={autoGenerate}
              onCheckedChange={setAutoGenerate}
            />
            <span>Auto-generate</span>
          </label>
          <div className="text-sm text-muted-foreground">
            {currentLanguageGeneratedCount}/{currentLanguageWordCount}
          </div>
        </div>
      </div>

      {/* Add Word Input */}
      <div className="flex space-x-2 mb-6">
        <Input
          ref={inputRef}
          placeholder={`Add a ${languageDisplayNames[currentLanguage]} word...`}
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
          className="flex-1"
        />
        <Button onClick={handleAddWord} disabled={!newWord.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Quick Actions */}
      {words.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={playAll}
              disabled={wordsWithAudio.length === 0}
            >
              <Play className="h-4 w-4 mr-1" />
              Play All
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={cyclePlayMode}
              disabled={wordsWithAudio.length === 0}
              title={getPlayModeTooltip()}
            >
              {getPlayModeIcon()}
            </Button>
            {!autoGenerate && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleGenerateAll}
                disabled={isGenerating || words.every(w => w.status === WordStatus.COMPLETE)}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Generate All
              </Button>
            )}
            {wordsWithAudio.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPractice(!showPractice)}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Practice
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Generating audio...</span>
            <span>{generationProgress.processed} / {generationProgress.total}</span>
          </div>
          <Progress value={(generationProgress.processed / generationProgress.total) * 100} />
        </div>
      )}

      {/* Practice Mode or Word List */}
      {showPractice ? (
        <SimplePractice
          words={words}
          onPlayAudio={playWord}
          onClose={() => setShowPractice(false)}
        />
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No words yet. Add your first word above!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map((word) => (
            <div
              key={word.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                currentWordId === word.id && "border-primary bg-primary/5"
              )}
            >
              <div>
                <p className="font-medium">{word.word}</p>
                {word.explanation && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {word.explanation.split('\n')[0]}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {word.status === WordStatus.COMPLETE ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => playWord(word.id)}
                  >
                    {currentWordId === word.id && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                ) : word.status === WordStatus.GENERATING ? (
                  <div className="w-9 h-9 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (word.status === WordStatus.ERROR || word.status === WordStatus.IDLE) && !autoGenerate ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => generateAudio(word.id)}
                    className={word.status === WordStatus.ERROR ? "text-rose-500" : ""}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                ) : null}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteWord(word.id)}
                  className="text-muted-foreground hover:text-rose-500"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Simple Audio Controls */}
      {!showPractice && currentWord && wordsWithAudio.length > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-background/95 backdrop-blur border rounded-full p-2 shadow-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={playPrevious}
            disabled={wordsWithAudio.findIndex(w => w.id === currentWordId) === 0}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <div className="px-3 min-w-[100px] text-center">
            <p className="font-medium text-sm">{currentWord.word}</p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            disabled={wordsWithAudio.findIndex(w => w.id === currentWordId) === wordsWithAudio.length - 1}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}