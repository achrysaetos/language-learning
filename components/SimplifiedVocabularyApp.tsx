import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWords } from '@/hooks/useWords';
import { Word, WordStatus, Language } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play, 
  Pause,
  Plus, 
  Search, 
  Settings, 
  Trash, 
  Upload, 
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  X,
  RefreshCw,
  Filter,
  Globe,
  ChevronDown,
  MoreHorizontal,
  Info,
  Sparkles
} from 'lucide-react';
import { getLanguageDisplayNames, getAllLanguageConfigs } from '@/lib/languageConfigs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SimplifiedVocabularyApp component
 * A unified interface for managing vocabulary with audio playback in multiple languages
 */
export default function SimplifiedVocabularyApp() {
  // Get word management functions from custom hook
  const {
    words,
    wordsMap,
    addWord,
    deleteWord,
    updateWord,
    generateAudio,
    generateAudioBatch,
    isGenerating,
    generationProgress,
    
    // Language-related functions
    currentLanguage,
    setCurrentLanguage,
    getCurrentLanguageConfig,
    getCurrentLanguageWords,
    
    // Stats for current language
    currentLanguageWordCount,
    currentLanguageGeneratedCount
  } = useWords();

  // Local state for form inputs
  const [newWord, setNewWord] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanationWord, setCurrentExplanationWord] = useState<Word | null>(null);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WordStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordId, setCurrentWordId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  
  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wordListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current word
  const currentWord = currentWordId ? wordsMap[currentWordId] : null;
  
  // Get language display names
  const languageDisplayNames = getLanguageDisplayNames();
  const languageConfigs = getAllLanguageConfigs();
  
  // Get current language configuration
  const currentLanguageConfig = getCurrentLanguageConfig();

  // Filter and sort words
  const filteredWords = getCurrentLanguageWords()
    .filter(word => {
      // Apply search filter
      if (searchQuery && !word.word.includes(searchQuery)) {
        return false;
      }
      
      // Apply status filter
      if (statusFilter !== 'all' && word.status !== statusFilter) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Initialize audio element when component mounts
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Set up audio event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });
      
      audioRef.current.addEventListener('ended', handleAudioEnded);
    }
    
    // Clean up event listeners on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleAudioEnded);
        audioRef.current.pause();
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update audio source when current word changes
  useEffect(() => {
    if (currentWord?.audioPath && audioRef.current) {
      audioRef.current.src = currentWord.audioPath;
      
      if (isPlaying) {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
        });
      }
    }
  }, [currentWord, isPlaying]);
  
  // Update volume and mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Set up progress tracking interval when playing
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    } else if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  // Handle audio ended event
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    
    // Auto-play next word if available
    const currentIndex = filteredWords.findIndex(w => w.id === currentWordId);
    if (currentIndex >= 0 && currentIndex < filteredWords.length - 1) {
      const nextWord = filteredWords[currentIndex + 1];
      if (nextWord.status === WordStatus.COMPLETE) {
        setCurrentWordId(nextWord.id);
        setIsPlaying(true);
      }
    }
  }, [currentWordId, filteredWords]);

  // Handle adding a single word
  const handleAddWord = useCallback(() => {
    if (!newWord.trim()) {
      setError('Please enter a word');
      return;
    }

    try {
      // Add word with current language
      const wordId = addWord(newWord.trim(), currentLanguage);
      setNewWord('');
      setError(null);
      
      // Auto-generate audio if enabled
      if (autoGenerate) {
        generateAudio(wordId).catch(err => {
          console.error('Error auto-generating audio:', err);
        });
      }
      
      // Focus the input field after adding
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add word');
    }
  }, [newWord, addWord, autoGenerate, generateAudio, currentLanguage]);

  // Handle adding multiple words from bulk input
  const handleAddBulkWords = useCallback(() => {
    if (!bulkWords.trim()) {
      setError('Please enter some words');
      return;
    }

    try {
      // Split by commas, spaces, newlines, or any combination
      const wordList = bulkWords
        .split(/[\s,，]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);

      if (wordList.length === 0) {
        setError('No valid words found');
        return;
      }

      // Add each word with current language
      const addedWordIds: string[] = [];
      wordList.forEach(word => {
        const wordId = addWord(word, currentLanguage);
        addedWordIds.push(wordId);
      });

      setBulkWords('');
      setShowBulkInput(false);
      setError(null);
      
      // Auto-generate audio if enabled
      if (autoGenerate && addedWordIds.length > 0) {
        generateAudioBatch(addedWordIds).catch(err => {
          console.error('Error auto-generating audio batch:', err);
        });
      }
      
      // Focus the input field after adding
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add words');
    }
  }, [bulkWords, addWord, autoGenerate, generateAudioBatch, currentLanguage]);

  // Handle generating audio for a single word
  const handleGenerateAudio = useCallback(async (wordId: string) => {
    try {
      setError(null);
      await generateAudio(wordId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    }
  }, [generateAudio]);

  // Handle generating audio for all words without audio
  const handleGenerateAllAudio = useCallback(async () => {
    // Get words without audio for current language only
    const wordsWithoutAudio = getCurrentLanguageWords()
      .filter(word => word.status === WordStatus.IDLE || word.status === WordStatus.ERROR)
      .map(word => word.id);
    
    if (wordsWithoutAudio.length === 0) {
      setError('No words need audio generation');
      return;
    }

    try {
      setError(null);
      await generateAudioBatch(wordsWithoutAudio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio batch');
    }
  }, [getCurrentLanguageWords, generateAudioBatch]);

  // Play audio for a word
  const playAudio = useCallback((wordId: string) => {
    const word = wordsMap[wordId];
    if (!word || !word.audioPath) return;
    
    setCurrentWordId(wordId);
    setShowPlayer(true);
    
    if (audioRef.current) {
      audioRef.current.src = word.audioPath;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }, [wordsMap]);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!currentWord?.audioPath) return;
    
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
    
    setIsPlaying(!isPlaying);
  }, [currentWord, isPlaying]);

  // Skip to next word
  const playNext = useCallback(() => {
    const currentIndex = filteredWords.findIndex(w => w.id === currentWordId);
    if (currentIndex >= 0 && currentIndex < filteredWords.length - 1) {
      const nextWord = filteredWords[currentIndex + 1];
      if (nextWord.status === WordStatus.COMPLETE) {
        setCurrentWordId(nextWord.id);
        setIsPlaying(true);
      }
    }
  }, [currentWordId, filteredWords]);
  
  // Skip to previous word
  const playPrevious = useCallback(() => {
    const currentIndex = filteredWords.findIndex(w => w.id === currentWordId);
    if (currentIndex > 0) {
      const prevWord = filteredWords[currentIndex - 1];
      if (prevWord.status === WordStatus.COMPLETE) {
        setCurrentWordId(prevWord.id);
        setIsPlaying(true);
      }
    }
  }, [currentWordId, filteredWords]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Play all words in sequence
  const playAllWords = useCallback(() => {
    const wordsWithAudio = filteredWords.filter(word => word.status === WordStatus.COMPLETE);
    
    if (wordsWithAudio.length === 0) {
      setError('No words with audio available');
      return;
    }
    
    setCurrentWordId(wordsWithAudio[0].id);
    setIsPlaying(true);
    setShowPlayer(true);
  }, [filteredWords]);

  // Format time (seconds) to mm:ss
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // View explanation for a word
  const viewExplanation = useCallback((word: Word) => {
    setCurrentExplanationWord(word);
    setShowExplanation(true);
  }, []);

  // Handle language change
  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as Language;
    setCurrentLanguage(newLanguage);
    // Reset filters when changing language
    setStatusFilter('all');
    setSearchQuery('');
    // Clear current word selection
    setCurrentWordId(null);
    setShowPlayer(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, [setCurrentLanguage]);

  // Get status color for a word
  const getStatusColor = (status: WordStatus) => {
    switch (status) {
      case WordStatus.COMPLETE:
        return 'bg-emerald-500';
      case WordStatus.GENERATING:
        return 'bg-blue-500';
      case WordStatus.PENDING:
        return 'bg-amber-500';
      case WordStatus.ERROR:
        return 'bg-rose-500';
      default:
        return 'bg-gray-300';
    }
  };

  // Get status tooltip text for a word
  const getStatusTooltip = (status: WordStatus) => {
    switch (status) {
      case WordStatus.COMPLETE:
        return 'Audio ready';
      case WordStatus.GENERATING:
        return 'Generating audio...';
      case WordStatus.PENDING:
        return 'Waiting to generate';
      case WordStatus.ERROR:
        return 'Error generating audio';
      default:
        return 'No audio generated';
    }
  };

  // Scroll to a word in the list
  const scrollToWord = useCallback((wordId: string) => {
    if (!wordListRef.current) return;
    
    const wordElement = document.getElementById(`word-${wordId}`);
    if (wordElement) {
      wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="py-6 relative max-w-4xl mx-auto">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      {/* Floating Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md py-3 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-primary" />
            <select 
              className="bg-transparent border-none text-lg font-medium focus:outline-none focus:ring-0 p-0 pr-6 appearance-none"
              value={currentLanguage}
              onChange={handleLanguageChange}
              style={{ backgroundPosition: 'right 0 center' }}
            >
              {languageConfigs.map(config => (
                <option key={config.code} value={config.code}>
                  {config.displayName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentLanguageGeneratedCount}</span>
              <span className="mx-1 opacity-50">/</span>
              <span>{currentLanguageWordCount}</span>
              <span className="ml-1 opacity-70">with audio</span>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Auto</span>
                    <Switch 
                      id="auto-generate" 
                      checked={autoGenerate}
                      onCheckedChange={setAutoGenerate}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Automatically generate audio when adding words</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "rounded-full transition-all",
                      showFilters && "bg-primary/10 text-primary"
                    )}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Show/hide filters</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Hero Input Section */}
        <div className="mt-4">
          {showBulkInput ? (
            <div className="space-y-2">
              <div className="relative">
                <Textarea
                  placeholder={`Enter multiple ${languageDisplayNames[currentLanguage]} words separated by spaces, commas, or new lines`}
                  value={bulkWords}
                  onChange={(e) => setBulkWords(e.target.value)}
                  rows={3}
                  className="w-full pr-24 resize-none rounded-xl border-muted bg-background/50 focus-visible:ring-primary"
                />
                <div className="absolute right-2 top-2 flex space-x-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setShowBulkInput(false)}
                    className="h-8 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleAddBulkWords}
                  className="rounded-full bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add {bulkWords.split(/[\s,，]+/).filter(w => w.trim().length > 0).length} Words
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Input
                ref={inputRef}
                placeholder={`Add a ${languageDisplayNames[currentLanguage]} word...`}
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                className="w-full pl-4 pr-24 h-12 text-lg rounded-full border-muted bg-background/50 focus-visible:ring-primary"
              />
              <div className="absolute right-2 top-2 flex space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setShowBulkInput(true)}
                        className="h-8 rounded-full"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Bulk add multiple words</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button 
                  size="sm" 
                  onClick={handleAddWord}
                  disabled={!newWord.trim()}
                  className="h-8 rounded-full bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Filters (conditionally shown) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center space-x-4 mt-4 pt-3 border-t border-border/40">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 rounded-full border-muted"
                  />
                </div>
                
                <select 
                  className="h-9 rounded-full border border-muted px-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as WordStatus | 'all')}
                >
                  <option value="all">All Status</option>
                  <option value={WordStatus.COMPLETE}>Complete</option>
                  <option value={WordStatus.GENERATING}>Generating</option>
                  <option value={WordStatus.PENDING}>Pending</option>
                  <option value={WordStatus.ERROR}>Error</option>
                  <option value={WordStatus.IDLE}>Not Generated</option>
                </select>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleGenerateAllAudio}
                        disabled={isGenerating}
                        className="h-9 rounded-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Generate audio for all words without audio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={playAllWords}
                        className="h-9 rounded-full"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Play All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Play all words with audio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg text-sm flex items-center"
            >
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 ml-auto"
                onClick={() => setError(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generation Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-6 px-5 py-4 bg-muted/30 rounded-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                Generating Audio ({generationProgress.processed}/{generationProgress.total})
              </div>
              
              {generationProgress.estimatedTimeRemaining !== undefined && (
                <div className="text-xs text-muted-foreground">
                  {Math.floor(generationProgress.estimatedTimeRemaining / 60)}m {generationProgress.estimatedTimeRemaining % 60}s remaining
                </div>
              )}
            </div>
            
            <Progress 
              value={(generationProgress.processed / generationProgress.total) * 100} 
              className="h-1.5 mb-2"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {generationProgress.successful} successful, {generationProgress.failed} failed
              </span>
              
              {generationProgress.currentWord && (
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1 animate-pulse" />
                  {generationProgress.currentWord}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word List */}
      <div className="mb-24" ref={wordListRef}>
        {filteredWords.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-muted/20">
            <p className="text-muted-foreground mb-3">No {languageDisplayNames[currentLanguage]} words match your criteria</p>
            {searchQuery && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery('')}
                className="rounded-full"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredWords.map((word) => (
              <motion.div 
                key={word.id} 
                id={`word-${word.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-center p-3 rounded-xl transition-all",
                  "hover:bg-muted/50",
                  currentWordId === word.id ? "bg-muted/80 border-l-4 border-primary pl-2" : "border-l-4 border-transparent"
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "w-2.5 h-2.5 rounded-full mr-2.5",
                            getStatusColor(word.status)
                          )} />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{getStatusTooltip(word.status)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <h3 className="text-lg font-medium">{word.word}</h3>
                  </div>
                  
                  {word.explanation && (
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => viewExplanation(word)}
                    >
                      <Info className="h-3 w-3 mr-1" />
                      View explanation
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  {word.status === WordStatus.COMPLETE ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => playAudio(word.id)}
                      className="rounded-full h-8 w-8 p-0"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={word.status === WordStatus.GENERATING || word.status === WordStatus.PENDING || isGenerating}
                      onClick={() => handleGenerateAudio(word.id)}
                      className="rounded-full h-8 w-8 p-0"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteWord(word.id)}
                    className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Audio Player */}
      <AnimatePresence>
        {showPlayer && currentWord && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-background/80 backdrop-blur-md border border-border/50 rounded-full shadow-lg py-2 px-4 z-40"
          >
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full h-8 w-8 mr-2 text-muted-foreground hover:text-rose-500"
                onClick={() => {
                  setShowPlayer(false);
                  setIsPlaying(false);
                  if (audioRef.current) {
                    audioRef.current.pause();
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div 
                className="flex-1 mr-3 cursor-pointer" 
                onClick={() => scrollToWord(currentWord.id)}
              >
                <div className="font-medium truncate">{currentWord.word}</div>
                <Progress 
                  value={(currentTime / (duration || 1)) * 100} 
                  className="h-1 mt-1"
                />
              </div>
              
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={playPrevious}
                  disabled={filteredWords.findIndex(w => w.id === currentWordId) <= 0}
                  className="rounded-full h-8 w-8 p-0"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </Button>
                
                <Button 
                  size="icon"
                  onClick={togglePlay}
                  className="rounded-full h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={playNext}
                  disabled={filteredWords.findIndex(w => w.id === currentWordId) >= filteredWords.length - 1}
                  className="rounded-full h-8 w-8 p-0"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleMute}
                  className="rounded-full h-8 w-8 p-0"
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Explanation Dialog */}
      {currentExplanationWord && (
        <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
          <DialogContent className="max-w-md rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center">
                <span className="mr-2">{currentExplanationWord.word}</span>
                <Sparkles className="h-4 w-4 text-primary" />
              </DialogTitle>
              <DialogDescription>
                Explanation and example sentences
              </DialogDescription>
            </DialogHeader>
            <div className="whitespace-pre-wrap text-sm">
              {currentExplanationWord.explanation || 'No explanation available'}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
