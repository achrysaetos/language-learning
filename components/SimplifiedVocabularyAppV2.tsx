import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useWords } from '@/hooks/useWords';
import { Word, WordStatus, Language } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  Clock, 
  Play, 
  Pause,
  Plus, 
  Search, 
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
  Info,
  Sparkles,
  Download,
  FileUp,
  BookOpen,
  BarChart3,
  HelpCircle,
  Keyboard
} from 'lucide-react';
import { getLanguageDisplayNames, getAllLanguageConfigs } from '@/lib/languageConfigs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts, commonShortcuts } from '@/hooks/useKeyboardShortcuts';
import { PracticeMode } from '@/components/PracticeMode';
import { StatsDashboard } from '@/components/StatsDashboard';
import { WordListSkeleton } from '@/components/LoadingSkeleton';
import { 
  exportWords, 
  exportToCSV, 
  downloadAsFile, 
  importWords, 
  mergeImportedWords 
} from '@/lib/exportImport';

// Memoized word item component
const WordItem = React.memo(({ 
  word, 
  isPlaying, 
  onPlay, 
  onDelete, 
  onGenerateAudio, 
  onViewExplanation,
  isGenerating 
}: {
  word: Word;
  isPlaying: boolean;
  onPlay: () => void;
  onDelete: () => void;
  onGenerateAudio: () => void;
  onViewExplanation: () => void;
  isGenerating: boolean;
}) => {
  const getStatusColor = (status: WordStatus) => {
    switch (status) {
      case WordStatus.COMPLETE: return 'bg-emerald-500';
      case WordStatus.GENERATING: return 'bg-blue-500';
      case WordStatus.PENDING: return 'bg-amber-500';
      case WordStatus.ERROR: return 'bg-rose-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusTooltip = (status: WordStatus) => {
    switch (status) {
      case WordStatus.COMPLETE: return 'Audio ready';
      case WordStatus.GENERATING: return 'Generating audio...';
      case WordStatus.PENDING: return 'Waiting to generate';
      case WordStatus.ERROR: return 'Error generating audio';
      default: return 'No audio generated';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center p-3 rounded-xl transition-all",
        "hover:bg-muted/50",
        isPlaying ? "bg-muted/80 border-l-4 border-primary pl-2" : "border-l-4 border-transparent"
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
            onClick={onViewExplanation}
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
            onClick={onPlay}
            className="rounded-full h-8 w-8 p-0"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            disabled={word.status === WordStatus.GENERATING || word.status === WordStatus.PENDING || isGenerating}
            onClick={onGenerateAudio}
            className="rounded-full h-8 w-8 p-0"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onDelete}
          className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-rose-500"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
});

WordItem.displayName = 'WordItem';

export default function SimplifiedVocabularyAppV2() {
  const {
    words,
    wordsMap,
    addWord,
    deleteWord,
    generateAudio,
    generateAudioBatch,
    isGenerating,
    generationProgress,
    currentLanguage,
    setCurrentLanguage,
    getCurrentLanguageConfig,
    getCurrentLanguageWords,
    currentLanguageWordCount,
    currentLanguageGeneratedCount
  } = useWords();

  // View state
  const [activeView, setActiveView] = useState<'words' | 'practice' | 'stats'>('words');
  
  // Local state
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
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordId, setCurrentWordId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  
  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current word
  const currentWord = currentWordId ? wordsMap[currentWordId] : null;
  
  // Get language display names
  const languageDisplayNames = getLanguageDisplayNames();
  const languageConfigs = getAllLanguageConfigs();

  // Memoized filtered words
  const filteredWords = useMemo(() => {
    return getCurrentLanguageWords()
      .filter(word => {
        if (searchQuery && !word.word.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (statusFilter !== 'all' && word.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [getCurrentLanguageWords, searchQuery, statusFilter]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        // Auto-play next
        const currentIndex = filteredWords.findIndex(w => w.id === currentWordId);
        if (currentIndex >= 0 && currentIndex < filteredWords.length - 1) {
          const nextWord = filteredWords[currentIndex + 1];
          if (nextWord.status === WordStatus.COMPLETE) {
            setCurrentWordId(nextWord.id);
            setIsPlaying(true);
          }
        }
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentWordId, filteredWords]);

  // Update audio source
  useEffect(() => {
    if (currentWord?.audioPath && audioRef.current) {
      audioRef.current.src = currentWord.audioPath;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [currentWord, isPlaying]);
  
  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handlers
  const handleAddWord = useCallback(() => {
    if (!newWord.trim()) {
      setError('Please enter a word');
      return;
    }

    try {
      const wordId = addWord(newWord.trim(), currentLanguage);
      setNewWord('');
      setError(null);
      
      if (autoGenerate) {
        generateAudio(wordId).catch(err => {
          console.error('Error auto-generating audio:', err);
        });
      }
      
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add word');
    }
  }, [newWord, addWord, autoGenerate, generateAudio, currentLanguage]);

  const handleAddBulkWords = useCallback(() => {
    if (!bulkWords.trim()) {
      setError('Please enter some words');
      return;
    }

    try {
      const wordList = bulkWords
        .split(/[\s,，]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);

      if (wordList.length === 0) {
        setError('No valid words found');
        return;
      }

      const addedWordIds: string[] = [];
      wordList.forEach(word => {
        const wordId = addWord(word, currentLanguage);
        addedWordIds.push(wordId);
      });

      setBulkWords('');
      setShowBulkInput(false);
      setError(null);
      
      if (autoGenerate && addedWordIds.length > 0) {
        generateAudioBatch(addedWordIds).catch(err => {
          console.error('Error auto-generating audio batch:', err);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add words');
    }
  }, [bulkWords, addWord, autoGenerate, generateAudioBatch, currentLanguage]);

  const handleGenerateAudio = useCallback(async (wordId: string) => {
    try {
      setError(null);
      await generateAudio(wordId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    }
  }, [generateAudio]);

  const handleGenerateAllAudio = useCallback(async () => {
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

  const handleExport = useCallback(() => {
    const format = window.confirm('Export as CSV? (OK for CSV, Cancel for JSON)') ? 'csv' : 'json';
    const currentWords = getCurrentLanguageWords();
    
    if (format === 'csv') {
      const csv = exportToCSV(currentWords);
      downloadAsFile(csv, `vocabulary-${currentLanguage}-${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const json = exportWords(currentWords, [], currentLanguage);
      downloadAsFile(json, `vocabulary-${currentLanguage}-${new Date().toISOString().split('T')[0]}.json`);
    }
  }, [getCurrentLanguageWords, currentLanguage]);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const content = await file.text();
      const { words: importedWords } = await importWords(content);
      
      const { merged, added, updated, skipped } = mergeImportedWords(
        wordsMap,
        importedWords
      );
      
      // Update words state
      Object.entries(merged).forEach(([id, word]) => {
        if (!wordsMap[id] || wordsMap[id] !== word) {
          addWord(word.word, word.languageCode);
        }
      });
      
      setError(null);
      alert(`Import complete! Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [wordsMap, addWord]);

  const playAudio = useCallback((wordId: string) => {
    const word = wordsMap[wordId];
    if (!word || !word.audioPath) return;
    
    setCurrentWordId(wordId);
    setShowPlayer(true);
    setIsPlaying(true);
  }, [wordsMap]);

  const togglePlay = useCallback(() => {
    if (!currentWord?.audioPath) return;
    setIsPlaying(prev => !prev);
    if (!isPlaying) {
      audioRef.current?.play().catch(console.error);
    } else {
      audioRef.current?.pause();
    }
  }, [currentWord, isPlaying]);

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

  const viewExplanation = useCallback((word: Word) => {
    setCurrentExplanationWord(word);
    setShowExplanation(true);
  }, []);

  // Keyboard shortcuts
  const shortcuts = useKeyboardShortcuts([
    {
      ...commonShortcuts.addWord,
      action: () => {
        setActiveView('words');
        inputRef.current?.focus();
      }
    },
    {
      ...commonShortcuts.bulkAdd,
      action: () => {
        setActiveView('words');
        setShowBulkInput(true);
      }
    },
    {
      ...commonShortcuts.search,
      action: () => {
        setActiveView('words');
        searchRef.current?.focus();
      }
    },
    {
      ...commonShortcuts.playPause,
      action: () => {
        if (currentWord) togglePlay();
      }
    },
    {
      ...commonShortcuts.generateAll,
      action: handleGenerateAllAudio
    },
    {
      ...commonShortcuts.exportData,
      action: handleExport
    },
    {
      ...commonShortcuts.importData,
      action: () => fileInputRef.current?.click()
    },
    {
      ...commonShortcuts.toggleHelp,
      action: () => setShowKeyboardHelp(prev => !prev)
    }
  ]);

  return (
    <div className="py-6 relative max-w-4xl mx-auto">
      <audio ref={audioRef} />
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        onChange={handleImport}
        className="hidden"
      />

      {/* Floating Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md py-3 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-primary" />
            <select 
              className="bg-transparent border-none text-lg font-medium focus:outline-none focus:ring-0 p-0 pr-6 appearance-none"
              value={currentLanguage}
              onChange={(e) => setCurrentLanguage(e.target.value as Language)}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKeyboardHelp(true)}
                    className="rounded-full"
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Keyboard shortcuts</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="words">Words</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="words" className="mt-4 space-y-4">
            {/* Input Section */}
            {showBulkInput ? (
              <div className="space-y-2">
                <Textarea
                  placeholder={`Enter multiple ${languageDisplayNames[currentLanguage]} words`}
                  value={bulkWords}
                  onChange={(e) => setBulkWords(e.target.value)}
                  rows={3}
                  className="w-full resize-none"
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setShowBulkInput(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddBulkWords}>
                    Add Words
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
                  className="pr-24"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setShowBulkInput(true)}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleAddWord}
                    disabled={!newWord.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                
                <Switch 
                  id="auto-generate" 
                  checked={autoGenerate}
                  onCheckedChange={setAutoGenerate}
                />
                <label htmlFor="auto-generate" className="text-sm">
                  Auto-generate
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={filteredWords.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAllAudio}
                  disabled={isGenerating}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate All
                </Button>
              </div>
            </div>
            
            {/* Progress */}
            {isGenerating && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Generating Audio</span>
                  <span>{generationProgress.processed}/{generationProgress.total}</span>
                </div>
                <Progress 
                  value={(generationProgress.processed / generationProgress.total) * 100} 
                />
              </div>
            )}
            
            {/* Error */}
            {error && (
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-lg flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
            
            {/* Word List */}
            {isLoading ? (
              <WordListSkeleton />
            ) : filteredWords.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No words match your search' : 'No words added yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredWords.map((word) => (
                  <WordItem
                    key={word.id}
                    word={word}
                    isPlaying={currentWordId === word.id}
                    onPlay={() => playAudio(word.id)}
                    onDelete={() => deleteWord(word.id)}
                    onGenerateAudio={() => handleGenerateAudio(word.id)}
                    onViewExplanation={() => viewExplanation(word)}
                    isGenerating={isGenerating}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="practice">
            <PracticeMode
              words={filteredWords}
              onClose={() => setActiveView('words')}
              onPlayAudio={playAudio}
            />
          </TabsContent>

          <TabsContent value="stats">
            <StatsDashboard
              words={words}
              currentLanguage={currentLanguage}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Audio Player */}
      <AnimatePresence>
        {showPlayer && currentWord && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 max-w-md w-full bg-background/80 backdrop-blur-md border rounded-full shadow-lg py-2 px-4 z-40"
          >
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setShowPlayer(false);
                  setIsPlaying(false);
                  audioRef.current?.pause();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 mx-3">
                <div className="font-medium">{currentWord.word}</div>
              </div>
              
              <div className="flex items-center space-x-1">
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
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
                  onClick={() => setIsMuted(prev => !prev)}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dialogs */}
      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentExplanationWord?.word}</DialogTitle>
            <DialogDescription>Explanation and example</DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-wrap">
            {currentExplanationWord?.explanation || 'No explanation available'}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {Object.values(commonShortcuts).map((shortcut) => (
              <div key={shortcut.key} className="flex justify-between">
                <span className="text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">
                  {shortcut.ctrl && 'Ctrl+'}{shortcut.shift && 'Shift+'}{shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}