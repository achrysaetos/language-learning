import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useWords } from '@/hooks/useWords';
import { Word, WordStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Filter
} from 'lucide-react';

/**
 * SimplifiedVocabularyApp component
 * A unified interface for managing Chinese vocabulary with audio playback
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

  // Get current word
  const currentWord = currentWordId ? wordsMap[currentWordId] : null;

  // Filter and sort words
  const filteredWords = words
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
      const wordId = addWord(newWord.trim());
      setNewWord('');
      setError(null);
      
      // Auto-generate audio if enabled
      if (autoGenerate) {
        generateAudio(wordId).catch(err => {
          console.error('Error auto-generating audio:', err);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add word');
    }
  }, [newWord, addWord, autoGenerate, generateAudio]);

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

      // Add each word
      const addedWordIds: string[] = [];
      wordList.forEach(word => {
        const wordId = addWord(word);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add words');
    }
  }, [bulkWords, addWord, autoGenerate, generateAudioBatch]);

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
    const wordsWithoutAudio = words
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
  }, [words, generateAudioBatch]);

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

  // Render status badge for a word
  const renderStatusBadge = (status: WordStatus) => {
    switch (status) {
      case WordStatus.COMPLETE:
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Complete</Badge>;
      case WordStatus.GENERATING:
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> Generating</Badge>;
      case WordStatus.PENDING:
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case WordStatus.ERROR:
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline">Not Generated</Badge>;
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
    <div className="container mx-auto py-8 relative">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      {/* Add Words Section */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Chinese Vocabulary</CardTitle>
            <CardDescription>
              Add words, generate audio, and listen to pronunciations
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="auto-generate" className="text-sm">
                      Auto-generate audio
                    </label>
                    <Switch 
                      id="auto-generate" 
                      checked={autoGenerate}
                      onCheckedChange={setAutoGenerate}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Automatically generate audio when adding new words</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {showBulkInput ? (
            <div className="space-y-4">
              <Textarea
                placeholder="Enter multiple words separated by spaces, commas, or new lines"
                value={bulkWords}
                onChange={(e) => setBulkWords(e.target.value)}
                rows={5}
                className="w-full"
              />
              <div className="flex space-x-2">
                <Button onClick={handleAddBulkWords}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Words
                </Button>
                <Button variant="outline" onClick={() => setShowBulkInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Input
                placeholder="Enter a Chinese word"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                className="flex-1"
              />
              <Button onClick={handleAddWord}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
              <Button variant="outline" onClick={() => setShowBulkInput(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Add
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <select 
            className="p-2 border rounded-md text-sm"
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
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateAllAudio}
            disabled={isGenerating}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate All
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={playAllWords}
          >
            <Play className="w-4 h-4 mr-2" />
            Play All
          </Button>
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <Card className="mb-8">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Generating Audio</CardTitle>
            <CardDescription>
              Processing {generationProgress.processed} of {generationProgress.total} words
            </CardDescription>
          </CardHeader>
          <CardContent className="py-3">
            <Progress 
              value={(generationProgress.processed / generationProgress.total) * 100} 
              className="h-2 mb-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {generationProgress.successful} successful, {generationProgress.failed} failed
              </span>
              {generationProgress.estimatedTimeRemaining !== undefined && (
                <span>
                  Estimated time remaining: {Math.floor(generationProgress.estimatedTimeRemaining / 60)}m {generationProgress.estimatedTimeRemaining % 60}s
                </span>
              )}
            </div>
            {generationProgress.currentWord && (
              <p className="mt-2 text-sm">
                Currently processing: <span className="font-medium">{generationProgress.currentWord}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Word List */}
      <div className="mb-24" ref={wordListRef}>
        {filteredWords.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground mb-2">No words match your criteria</p>
            {searchQuery && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWords.map((word) => (
              <Card 
                key={word.id} 
                id={`word-${word.id}`}
                className={`overflow-hidden transition-all ${currentWordId === word.id ? 'border-primary' : ''}`}
              >
                <div className="flex items-center p-4">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-xl font-medium mr-2">{word.word}</h3>
                      {renderStatusBadge(word.status)}
                    </div>
                    
                    {word.explanation && (
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm"
                        onClick={() => viewExplanation(word)}
                      >
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
                        className="flex-nowrap whitespace-nowrap"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Play
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={word.status === WordStatus.GENERATING || word.status === WordStatus.PENDING || isGenerating}
                        onClick={() => handleGenerateAudio(word.id)}
                        className="flex-nowrap whitespace-nowrap"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Generate
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => deleteWord(word.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Audio Player */}
      {showPlayer && currentWord && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-3 z-10">
          <div className="container mx-auto flex items-center">
            <div className="flex-1 flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                className="mr-2"
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
              
              <div className="flex-1 mr-4">
                <div 
                  className="font-medium text-lg cursor-pointer" 
                  onClick={() => scrollToWord(currentWord.id)}
                >
                  {currentWord.word}
                </div>
                <Progress 
                  value={(currentTime / (duration || 1)) * 100} 
                  className="h-1 mt-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={playPrevious}
                disabled={filteredWords.findIndex(w => w.id === currentWordId) <= 0}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button 
                size="icon"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={playNext}
                disabled={filteredWords.findIndex(w => w.id === currentWordId) >= filteredWords.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Explanation Dialog */}
      {currentExplanationWord && (
        <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentExplanationWord.word}</DialogTitle>
              <DialogDescription>
                Explanation and example sentences
              </DialogDescription>
            </DialogHeader>
            <div className="whitespace-pre-wrap">
              {currentExplanationWord.explanation || 'No explanation available'}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
