'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Word, WordStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  SkipForward, 
  Volume2,
  RotateCcw,
  Trophy,
  Clock,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PracticeModeProps {
  words: Word[];
  onClose: () => void;
  onPlayAudio: (wordId: string) => void;
}

interface QuizStats {
  correct: number;
  incorrect: number;
  skipped: number;
  totalTime: number;
  startTime: Date;
}

export function PracticeMode({ words, onClose, onPlayAudio }: PracticeModeProps) {
  // Filter words that have audio
  const practiceWords = words.filter(w => w.status === WordStatus.COMPLETE);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userGuess, setUserGuess] = useState('');
  const [stats, setStats] = useState<QuizStats>({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    totalTime: 0,
    startTime: new Date()
  });
  const [mode, setMode] = useState<'listening' | 'reading'>('listening');
  const [isComplete, setIsComplete] = useState(false);

  const currentWord = practiceWords[currentIndex];
  const progress = ((currentIndex + 1) / practiceWords.length) * 100;

  useEffect(() => {
    if (currentIndex >= practiceWords.length && practiceWords.length > 0) {
      setIsComplete(true);
      const endTime = new Date();
      setStats(prev => ({
        ...prev,
        totalTime: Math.floor((endTime.getTime() - prev.startTime.getTime()) / 1000)
      }));
    }
  }, [currentIndex, practiceWords.length]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
      setUserGuess('');
    }, 1500);
  }, []);

  const handleSkip = useCallback(() => {
    setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    setCurrentIndex(prev => prev + 1);
    setShowAnswer(false);
    setUserGuess('');
  }, []);

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setUserGuess('');
    setStats({
      correct: 0,
      incorrect: 0,
      skipped: 0,
      totalTime: 0,
      startTime: new Date()
    });
    setIsComplete(false);
  }, []);

  const playCurrentAudio = useCallback(() => {
    if (currentWord) {
      onPlayAudio(currentWord.id);
    }
  }, [currentWord, onPlayAudio]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (practiceWords.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            No words with audio available for practice. Generate audio for some words first!
          </p>
          <Button onClick={onClose} className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isComplete) {
    const accuracy = stats.correct / (stats.correct + stats.incorrect + stats.skipped) * 100;
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-center">
            <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
            Practice Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.correct}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="text-center p-4 bg-rose-500/10 rounded-lg">
              <XCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.incorrect}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Accuracy
              </span>
              <span className="font-bold">{accuracy.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Time
              </span>
              <span className="font-bold">{formatTime(stats.totalTime)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <SkipForward className="h-4 w-4 mr-2" />
                Skipped
              </span>
              <span className="font-bold">{stats.skipped}</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleReset} variant="default" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Practice Again
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Exit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle>Practice Mode</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode(mode === 'listening' ? 'reading' : 'listening')}
            >
              {mode === 'listening' ? '👂 Listening' : '👁️ Reading'}
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentIndex + 1} of {practiceWords.length}</span>
            <span>{stats.correct} correct, {stats.incorrect} incorrect</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentWord && (
          <>
            <div className="text-center space-y-4">
              {mode === 'listening' ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Listen to the audio and type what you hear
                  </p>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={playCurrentAudio}
                    className="mx-auto"
                  >
                    <Volume2 className="h-6 w-6 mr-2" />
                    Play Audio
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    What does this word mean?
                  </p>
                  <p className="text-4xl font-bold">{currentWord.word}</p>
                </>
              )}
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={userGuess}
                onChange={(e) => setUserGuess(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userGuess.trim()) {
                    setShowAnswer(true);
                  }
                }}
                placeholder={mode === 'listening' ? 'Type what you hear...' : 'Type the meaning...'}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={showAnswer}
              />

              {showAnswer && (
                <div className={cn(
                  "p-4 rounded-lg",
                  userGuess.toLowerCase().trim() === currentWord.word.toLowerCase().trim()
                    ? "bg-emerald-500/10 border border-emerald-500"
                    : "bg-rose-500/10 border border-rose-500"
                )}>
                  <p className="font-medium mb-2">
                    {userGuess.toLowerCase().trim() === currentWord.word.toLowerCase().trim()
                      ? '✅ Correct!' : '❌ Incorrect'}
                  </p>
                  <p className="text-sm">
                    <strong>Answer:</strong> {currentWord.word}
                  </p>
                  {currentWord.explanation && (
                    <p className="text-sm mt-2 text-muted-foreground">
                      {currentWord.explanation.split('\n')[0]}
                    </p>
                  )}
                </div>
              )}

              <div className="flex space-x-2">
                {!showAnswer ? (
                  <>
                    <Button
                      onClick={() => setShowAnswer(true)}
                      variant="default"
                      disabled={!userGuess.trim()}
                      className="flex-1"
                    >
                      Check Answer
                    </Button>
                    <Button
                      onClick={handleSkip}
                      variant="outline"
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleAnswer(
                      userGuess.toLowerCase().trim() === currentWord.word.toLowerCase().trim()
                    )}
                    variant="default"
                    className="flex-1"
                  >
                    Next Word
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose} variant="ghost" size="sm">
            Exit Practice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}