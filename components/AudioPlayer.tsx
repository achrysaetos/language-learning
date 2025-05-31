import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWords } from '@/hooks/useWords';
import { Word, WordStatus, Playlist } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Repeat, 
  Volume2, 
  VolumeX,
  Info,
  Bug,
  AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * AudioPlayer component for playing playlists of Chinese words
 */
export default function AudioPlayer() {
  // Get word and playlist data from custom hook
  const {
    words: allWords,
    wordsMap,
    playlists,
    createPlaylist,
    addWordToPlaylist,
    removeWordFromPlaylist,
    generatedWordCount,
  } = useWords();

  // Audio player state
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const defaultPlaylistCreatedRef = useRef(false);

  // Get current playlist and words
  const currentPlaylist = currentPlaylistId ? playlists.find(p => p.id === currentPlaylistId) : null;
  const playlistWords = currentPlaylist 
    ? currentPlaylist.words
      .map(id => wordsMap[id])
      .filter(word => word && word.status === WordStatus.COMPLETE)
    : [];
  
  // Get current word
  const currentWord = currentWordIndex >= 0 && currentWordIndex < playlistWords.length 
    ? playlistWords[currentWordIndex] 
    : null;

  // Debug info - log completed words
  const completeWords = allWords.filter(word => word.status === WordStatus.COMPLETE);
  
  // Add console logs for debugging
  useEffect(() => {
    console.log('AudioPlayer - All Words:', allWords);
    console.log('AudioPlayer - Complete Words:', completeWords);
    console.log('AudioPlayer - Complete Words Count:', completeWords.length);
    console.log('AudioPlayer - generatedWordCount:', generatedWordCount);
    console.log('AudioPlayer - Playlists:', playlists);
    console.log('AudioPlayer - Current Playlist:', currentPlaylist);
    console.log('AudioPlayer - Playlist Words:', playlistWords);
    console.log('AudioPlayer - WordsMap:', wordsMap);
  }, [allWords, completeWords, playlists, currentPlaylist, playlistWords, wordsMap, generatedWordCount]);

  // Handle audio ended event - properly memoized with all dependencies
  const handleAudioEnded = useCallback(() => {
    if (currentWordIndex < playlistWords.length - 1) {
      // Move to next word
      setCurrentWordIndex(prev => prev + 1);
    } else if (loop) {
      // Loop back to first word
      setCurrentWordIndex(0);
    } else {
      // End of playlist
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentWordIndex, playlistWords.length, loop]);

  // Initialize audio element when component mounts
  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    // Set up audio event listeners
    const audio = audioRef.current;
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('loadedmetadata', () => {
      if (audio) {
        setDuration(audio.duration);
      }
    });
    
    // Clean up event listeners on unmount
    return () => {
      if (audio) {
        audio.removeEventListener('ended', handleAudioEnded);
        audio.pause();
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [handleAudioEnded]); // Only depend on handleAudioEnded which is properly memoized
  
  // Update audio source when current word changes
  useEffect(() => {
    if (currentWord && currentWord.audioPath && audioRef.current) {
      console.log('Setting audio source:', currentWord.audioPath);
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
  
  // Play/pause toggle
  const togglePlay = useCallback(() => {
    if (!currentWord) {
      if (playlistWords.length > 0) {
        setCurrentWordIndex(0);
        setIsPlaying(true);
      }
      return;
    }
    
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
    
    setIsPlaying(!isPlaying);
  }, [currentWord, isPlaying, playlistWords.length]);
  
  // Skip to next word
  const playNext = useCallback(() => {
    if (currentWordIndex < playlistWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  }, [currentWordIndex, playlistWords.length]);
  
  // Skip to previous word
  const playPrevious = useCallback(() => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  }, [currentWordIndex]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  
  // Toggle loop
  const toggleLoop = useCallback(() => {
    setLoop(prev => !prev);
  }, []);
  
  // Toggle auto-play
  const toggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => !prev);
  }, []);
  
  // Format time (seconds) to mm:ss
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Play a specific word from the playlist
  const playWordAt = useCallback((index: number) => {
    setCurrentWordIndex(index);
    setIsPlaying(true);
  }, []);
  
  // Change current playlist
  const selectPlaylist = useCallback((playlistId: string) => {
    setCurrentPlaylistId(playlistId);
    setCurrentWordIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);
  
  // Create a default playlist if none exists (only runs once)
  useEffect(() => {
    // Skip if we've already created a default playlist or if there are playlists
    if (defaultPlaylistCreatedRef.current || playlists.length > 0) {
      return;
    }

    // Get complete words
    const completeWords = allWords.filter(word => word.status === WordStatus.COMPLETE);
    console.log('Creating default playlist with complete words:', completeWords);
    
    if (completeWords.length > 0) {
      // Create a default playlist with all complete words
      const playlistId = createPlaylist('My Playlist');
      
      // Mark as created to prevent infinite loop
      defaultPlaylistCreatedRef.current = true;
      
      // Add words to playlist
      completeWords.forEach(word => {
        console.log('Adding word to default playlist:', word);
        addWordToPlaylist(playlistId, word.id);
      });
      
      // Set as current playlist
      setCurrentPlaylistId(playlistId);
    }
  }, [allWords, createPlaylist, addWordToPlaylist, playlists.length]);
  
  // Set first playlist as current if none selected
  useEffect(() => {
    if (playlists.length > 0 && !currentPlaylistId) {
      setCurrentPlaylistId(playlists[0].id);
    }
  }, [playlists, currentPlaylistId]);

  // Toggle debug info display
  const toggleDebugInfo = useCallback(() => {
    setShowDebugInfo(prev => !prev);
  }, []);

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Audio Player</CardTitle>
            <CardDescription>
              Listen to your vocabulary words
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleDebugInfo}
          >
            <Bug className="w-4 h-4 mr-2" />
            {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Debug Information */}
          {showDebugInfo && (
            <Alert className="mb-6 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Debug Information</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2 text-xs font-mono overflow-auto max-h-60 p-2 bg-black/5 rounded">
                  <div><strong>Total Words:</strong> {allWords.length}</div>
                  <div><strong>Complete Words:</strong> {completeWords.length}</div>
                  <div><strong>Generated Word Count:</strong> {generatedWordCount}</div>
                  <div><strong>Playlists Count:</strong> {playlists.length}</div>
                  <div><strong>Current Playlist ID:</strong> {currentPlaylistId || 'none'}</div>
                  <div><strong>Playlist Words Count:</strong> {playlistWords.length}</div>
                  <div><strong>Default Playlist Created:</strong> {defaultPlaylistCreatedRef.current ? 'Yes' : 'No'}</div>
                  
                  <div className="mt-4"><strong>Complete Words:</strong></div>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(completeWords, null, 2)}
                  </pre>
                  
                  <div className="mt-4"><strong>Current Playlist:</strong></div>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(currentPlaylist, null, 2)}
                  </pre>
                  
                  <div className="mt-4"><strong>Word Status Counts:</strong></div>
                  <div>IDLE: {allWords.filter(w => w.status === WordStatus.IDLE).length}</div>
                  <div>PENDING: {allWords.filter(w => w.status === WordStatus.PENDING).length}</div>
                  <div>GENERATING: {allWords.filter(w => w.status === WordStatus.GENERATING).length}</div>
                  <div>COMPLETE: {allWords.filter(w => w.status === WordStatus.COMPLETE).length}</div>
                  <div>ERROR: {allWords.filter(w => w.status === WordStatus.ERROR).length}</div>
                  
                  <div className="mt-4"><strong>Audio Files Check:</strong></div>
                  {completeWords.map(word => (
                    <div key={word.id} className="flex items-center gap-2">
                      <span>{word.word}</span>
                      <span>Path: {word.audioPath || 'none'}</span>
                      <span className={word.audioPath ? 'text-green-500' : 'text-red-500'}>
                        {word.audioPath ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Playlist Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Playlist</label>
            <select 
              className="w-full p-2 border rounded-md"
              value={currentPlaylistId || ''}
              onChange={(e) => selectPlaylist(e.target.value)}
            >
              <option value="" disabled>Select a playlist</option>
              {playlists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} ({playlist.words.length} words)
                </option>
              ))}
            </select>
          </div>
          
          {/* Current Word Display */}
          <div className="mb-6 text-center">
            {currentWord ? (
              <>
                <h2 className="text-3xl font-bold mb-2">{currentWord.word}</h2>
                {currentWord.pinyin && (
                  <p className="text-lg text-muted-foreground mb-2">{currentWord.pinyin}</p>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowExplanation(true)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  View Explanation
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                {playlistWords.length > 0 
                  ? 'Select a word to play' 
                  : completeWords.length > 0 
                    ? 'No words available in this playlist' 
                    : 'No completed words available. Generate audio for words first.'}
              </p>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <Progress 
              value={(currentTime / (duration || 1)) * 100} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <Button 
              variant="outline" 
              size="icon"
              onClick={playPrevious}
              disabled={currentWordIndex <= 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button 
              size="icon"
              onClick={togglePlay}
              disabled={playlistWords.length === 0}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={playNext}
              disabled={currentWordIndex >= playlistWords.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            <Button 
              variant={loop ? "default" : "outline"} 
              size="icon"
              onClick={toggleLoop}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Playback Settings */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <label htmlFor="auto-play" className="text-sm">
                Auto-play next word
              </label>
              <Switch 
                id="auto-play" 
                checked={autoPlay}
                onCheckedChange={setAutoPlay}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="volume" className="text-sm">
                Volume
              </label>
              <input 
                id="volume"
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24"
              />
            </div>
          </div>
          
          {/* Playlist Words */}
          <div>
            <h3 className="text-lg font-medium mb-2">Playlist Words</h3>
            {playlistWords.length === 0 ? (
              <Alert className="bg-blue-50 dark:bg-blue-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Words in Playlist</AlertTitle>
                <AlertDescription>
                  {completeWords.length > 0 ? (
                    <>
                      You have {completeWords.length} completed words, but none are in this playlist.
                      {showDebugInfo ? '' : ' Enable debug mode for more details.'}
                    </>
                  ) : (
                    <>
                      No words with completed audio generation found. 
                      Go to the "Manage Words" tab and generate audio for some words first.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {playlistWords.map((word, index) => (
                  <div 
                    key={word.id}
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                      index === currentWordIndex ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                    }`}
                    onClick={() => playWordAt(index)}
                  >
                    <div className="flex items-center space-x-2">
                      {index === currentWordIndex && isPlaying ? (
                        <Badge className="bg-green-500">Playing</Badge>
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                      <span className="font-medium">{word.word}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        playWordAt(index);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Explanation Dialog */}
      {currentWord && (
        <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentWord.word}</DialogTitle>
              <DialogDescription>
                Explanation and example sentences
              </DialogDescription>
            </DialogHeader>
            <div className="whitespace-pre-wrap">
              {currentWord.explanation || 'No explanation available'}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
