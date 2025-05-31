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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Clock, FolderPlus, ListPlus, Play, Plus, PlusCircle, Save, Trash, Upload, Volume2, XCircle } from 'lucide-react';

/**
 * WordManager component for adding, viewing, and generating audio for Chinese words
 */
export default function WordManager() {
  // Get word management functions from custom hook
  const {
    words,
    wordsMap,
    addWord,
    deleteWord,
    generateAudio,
    generateAudioBatch,
    isGenerating,
    generationProgress,
    playlists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addWordToPlaylist,
    removeWordFromPlaylist,
  } = useWords();

  // Local state for form inputs
  const [newWord, setNewWord] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Playlist management state
  const [showCreatePlaylistDialog, setShowCreatePlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showAddToPlaylistDialog, setShowAddToPlaylistDialog] = useState(false);

  // Handle adding a single word
  const handleAddWord = useCallback(() => {
    if (!newWord.trim()) {
      setError('Please enter a word');
      return;
    }

    try {
      addWord(newWord.trim());
      setNewWord('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add word');
    }
  }, [newWord, addWord]);

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
      wordList.forEach(word => {
        addWord(word);
      });

      setBulkWords('');
      setShowBulkInput(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add words');
    }
  }, [bulkWords, addWord]);

  // Handle generating audio for a single word
  const handleGenerateAudio = useCallback(async (wordId: string) => {
    try {
      setError(null);
      await generateAudio(wordId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    }
  }, [generateAudio]);

  // Handle generating audio for multiple selected words
  const handleBatchGenerate = useCallback(async () => {
    if (selectedWords.size === 0) {
      setError('Please select at least one word');
      return;
    }

    try {
      setError(null);
      await generateAudioBatch(Array.from(selectedWords));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio batch');
    }
  }, [selectedWords, generateAudioBatch]);

  // Toggle word selection for batch operations
  const toggleWordSelection = useCallback((wordId: string) => {
    setSelectedWords(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(wordId)) {
        newSelection.delete(wordId);
      } else {
        newSelection.add(wordId);
      }
      return newSelection;
    });
  }, []);

  // Toggle all words selection
  const toggleAllWords = useCallback(() => {
    if (selectedWords.size === words.length) {
      // Deselect all
      setSelectedWords(new Set());
    } else {
      // Select all
      setSelectedWords(new Set(words.map(word => word.id)));
    }
  }, [words, selectedWords.size]);

  // Play audio for a word
  const playAudio = useCallback((audioPath: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioPath;
      audioRef.current.play();
    }
  }, []);

  // Create a new playlist
  const handleCreatePlaylist = useCallback(() => {
    if (!newPlaylistName.trim()) {
      setError('Please enter a playlist name');
      return;
    }

    try {
      const playlistId = createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim() || undefined);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreatePlaylistDialog(false);
      setSelectedPlaylistId(playlistId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    }
  }, [newPlaylistName, newPlaylistDescription, createPlaylist]);

  // Add selected words to a playlist
  const handleAddToPlaylist = useCallback(() => {
    if (selectedWords.size === 0) {
      setError('Please select at least one word');
      return;
    }

    if (!selectedPlaylistId) {
      setError('Please select a playlist');
      return;
    }

    try {
      Array.from(selectedWords).forEach(wordId => {
        addWordToPlaylist(selectedPlaylistId, wordId);
      });
      setShowAddToPlaylistDialog(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add words to playlist');
    }
  }, [selectedWords, selectedPlaylistId, addWordToPlaylist]);

  // Create a default playlist and add selected words
  const handleAddToDefaultPlaylist = useCallback(() => {
    if (selectedWords.size === 0) {
      setError('Please select at least one word');
      return;
    }

    try {
      // Find default playlist or create one
      let defaultPlaylistId = playlists.find(p => p.name === 'Default Playlist')?.id;
      
      if (!defaultPlaylistId) {
        defaultPlaylistId = createPlaylist('Default Playlist', 'Automatically created default playlist');
      }

      // Add selected words to default playlist
      Array.from(selectedWords).forEach(wordId => {
        addWordToPlaylist(defaultPlaylistId!, wordId);
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add words to default playlist');
    }
  }, [selectedWords, playlists, createPlaylist, addWordToPlaylist]);

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
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge className="bg-gray-500">Not Generated</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add Chinese Words</CardTitle>
          <CardDescription>
            Enter Chinese words to add to your vocabulary list
          </CardDescription>
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

      {/* Playlist Management */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Playlist Management</CardTitle>
            <CardDescription>
              Create playlists and add words to them
            </CardDescription>
          </div>
          <Dialog open={showCreatePlaylistDialog} onOpenChange={setShowCreatePlaylistDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
                <DialogDescription>
                  Enter a name and optional description for your playlist
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="playlist-name" className="text-sm font-medium">
                    Playlist Name
                  </label>
                  <Input
                    id="playlist-name"
                    placeholder="My Chinese Playlist"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="playlist-description" className="text-sm font-medium">
                    Description (Optional)
                  </label>
                  <Textarea
                    id="playlist-description"
                    placeholder="A collection of Chinese words I'm learning"
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreatePlaylistDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlaylist}>
                  Create Playlist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {selectedWords.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddToDefaultPlaylist}
                >
                  <ListPlus className="w-4 h-4 mr-2" />
                  Add to Default Playlist
                </Button>
                
                <Dialog open={showAddToPlaylistDialog} onOpenChange={setShowAddToPlaylistDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Add to Playlist
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Playlist</DialogTitle>
                      <DialogDescription>
                        Select a playlist to add {selectedWords.size} selected word(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={selectedPlaylistId || ''}
                        onChange={(e) => setSelectedPlaylistId(e.target.value)}
                      >
                        <option value="" disabled>Select a playlist</option>
                        {playlists.map(playlist => (
                          <option key={playlist.id} value={playlist.id}>
                            {playlist.name} ({playlist.words.length} words)
                          </option>
                        ))}
                      </select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddToPlaylistDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddToPlaylist}>
                        Add to Playlist
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Select words from the list below to add them to playlists
              </p>
            )}

            {playlists.length > 0 ? (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Your Playlists</h3>
                <div className="space-y-2">
                  {playlists.map(playlist => (
                    <div 
                      key={playlist.id} 
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    >
                      <div>
                        <h4 className="font-medium">{playlist.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {playlist.words.length} words
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedPlaylistId(playlist.id);
                            setShowAddToPlaylistDialog(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Words
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert className="bg-blue-50 dark:bg-blue-900/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Playlists Yet</AlertTitle>
                <AlertDescription>
                  Create your first playlist to organize your vocabulary words
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Progress */}
      {isGenerating && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generating Audio</CardTitle>
            <CardDescription>
              Processing {generationProgress.processed} of {generationProgress.total} words
            </CardDescription>
          </CardHeader>
          <CardContent>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Words</CardTitle>
            <CardDescription>
              {words.length} words in your vocabulary list
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleAllWords}
            >
              {selectedWords.size === words.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button 
              size="sm" 
              onClick={handleBatchGenerate}
              disabled={selectedWords.size === 0 || isGenerating}
            >
              <Play className="w-4 h-4 mr-2" />
              Generate Selected ({selectedWords.size})
            </Button>
            {selectedWords.size > 0 && (
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => setShowAddToPlaylistDialog(true)}
              >
                <Save className="w-4 h-4 mr-2" />
                Add to Playlist ({selectedWords.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {words.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No words added yet. Add some words to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {words.map((word) => (
                <div 
                  key={word.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    selectedWords.has(word.id) ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => toggleWordSelection(word.id)}
                >
                  <div className="flex items-center space-x-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedWords.has(word.id)}
                      onChange={() => {}} // Handled by the div click
                      className="h-4 w-4"
                    />
                    <div>
                      <h3 className="text-lg font-medium">{word.word}</h3>
                      {word.explanation && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto">View explanation</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{word.word}</DialogTitle>
                            </DialogHeader>
                            <div className="whitespace-pre-wrap">
                              {word.explanation}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {renderStatusBadge(word.status)}
                    
                    {word.audioPath && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(word.audioPath!);
                        }}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      disabled={word.status === WordStatus.GENERATING || word.status === WordStatus.PENDING || isGenerating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateAudio(word.id);
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWord(word.id);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Click on a word to select it for batch processing or adding to playlists
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
