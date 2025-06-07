import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Word, WordStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, Eye, EyeOff, Shuffle } from 'lucide-react';

interface SimplePracticeProps {
  words: Word[];
  onPlayAudio: (wordId: string) => void;
  onClose: () => void;
}

export function SimplePractice({ words, onPlayAudio, onClose }: SimplePracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  
  // Filter and optionally shuffle words
  const practiceWords = useMemo(() => {
    const filtered = words.filter(w => w.status === WordStatus.COMPLETE);
    if (!isShuffled) return filtered;
    
    // Shuffle array
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [words, isShuffled]);
  
  const currentWord = practiceWords[currentIndex];
  const hasNext = currentIndex < practiceWords.length - 1;
  const hasPrevious = currentIndex > 0;

  const handleNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setIsFlipped(false);
    }
  }, [currentIndex, hasNext]);

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
      setIsFlipped(false);
    }
  }, [currentIndex, hasPrevious]);

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  }, [isFlipped, showAnswer]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsFlipped(false);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(!isShuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
    setIsFlipped(false);
  }, [isShuffled]);

  const handlePlayAudio = useCallback(() => {
    if (currentWord) {
      onPlayAudio(currentWord.id);
    }
  }, [currentWord, onPlayAudio]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleFlip();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          handlePlayAudio();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleFlip, handlePlayAudio, onClose]);

  if (practiceWords.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground mb-4">
          Generate audio for some words first to practice!
        </p>
        <Button onClick={onClose}>Go Back</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="text-center text-sm text-muted-foreground">
          Card {currentIndex + 1} of {practiceWords.length}
          {isShuffled && <span className="ml-2 text-primary">(Shuffled)</span>}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div 
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / practiceWords.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="relative" style={{ perspective: '1000px' }}>
        <Card 
          className={`relative min-h-[300px] p-8 cursor-pointer transition-all duration-500 hover:shadow-lg transform-gpu ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
          onClick={handleFlip}
        >
          {/* Front of card */}
          <div 
            className="absolute inset-0 p-8 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <h2 className="text-3xl font-bold text-center mb-6">{currentWord.word}</h2>
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayAudio();
              }}
            >
              <Volume2 className="h-5 w-5 mr-2" />
              Play Audio
            </Button>
            <p className="text-sm text-muted-foreground absolute bottom-4">
              Tap card to see explanation
            </p>
            <EyeOff className="h-4 w-4 text-muted-foreground absolute top-4 right-4" />
          </div>

          {/* Back of card */}
          <div 
            className="absolute inset-0 p-8 flex flex-col items-center justify-center"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="text-center space-y-4 max-w-lg">
              <h3 className="text-xl font-semibold">{currentWord.word}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayAudio();
                }}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Play
              </Button>
              {currentWord.explanation && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-40 mt-4">
                  {currentWord.explanation}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground absolute bottom-4">
              Tap card to flip back
            </p>
            <Eye className="h-4 w-4 text-muted-foreground absolute top-4 right-4" />
          </div>
        </Card>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={!hasPrevious}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleShuffle}
            title={isShuffled ? "Order mode" : "Shuffle mode"}
            className={isShuffled ? "text-primary" : ""}
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRestart}
            title="Start over"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Exit
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={!hasNext}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Keyboard hints */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Click card or press Space/Enter to flip</p>
        <p>Use ← → arrows to navigate • Press P to play audio • Esc to exit</p>
      </div>
    </div>
  );
}