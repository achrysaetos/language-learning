import React, { useState, useCallback } from 'react';
import { Word, WordStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Volume2, Check, X, RotateCcw } from 'lucide-react';

interface SimplePracticeProps {
  words: Word[];
  onPlayAudio: (wordId: string) => void;
  onClose: () => void;
}

export function SimplePractice({ words, onPlayAudio, onClose }: SimplePracticeProps) {
  const practiceWords = words.filter(w => w.status === WordStatus.COMPLETE);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  
  const currentWord = practiceWords[currentIndex];
  const isComplete = currentIndex >= practiceWords.length;

  const handleCheck = useCallback(() => {
    if (!userInput.trim()) return;
    
    const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase();
    if (isCorrect) setScore(score + 1);
    
    setShowResult(true);
    
    setTimeout(() => {
      setCurrentIndex(currentIndex + 1);
      setUserInput('');
      setShowResult(false);
    }, 2000);
  }, [userInput, currentWord, currentIndex, score]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setUserInput('');
    setShowResult(false);
  }, []);

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

  if (isComplete) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-xl font-semibold mb-4">Practice Complete!</h3>
        <p className="text-lg mb-6">
          Your score: {score} / {practiceWords.length}
        </p>
        <div className="flex justify-center space-x-2">
          <Button onClick={handleRestart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={onClose}>
            Exit
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Question {currentIndex + 1} of {practiceWords.length}
        </p>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onPlayAudio(currentWord.id)}
          className="mb-4"
        >
          <Volume2 className="h-5 w-5 mr-2" />
          Play Audio
        </Button>
        <p className="text-sm text-muted-foreground">
          Listen and type what you hear
        </p>
      </div>

      <div className="space-y-4">
        <Input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          placeholder="Type your answer..."
          disabled={showResult}
          className="text-center text-lg"
        />

        {showResult && (
          <div className={`text-center p-3 rounded-lg ${
            userInput.trim().toLowerCase() === currentWord.word.toLowerCase()
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {userInput.trim().toLowerCase() === currentWord.word.toLowerCase() ? (
              <div className="flex items-center justify-center">
                <Check className="h-5 w-5 mr-2" />
                Correct!
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center mb-1">
                  <X className="h-5 w-5 mr-2" />
                  Incorrect
                </div>
                <p className="text-sm">Answer: {currentWord.word}</p>
              </div>
            )}
          </div>
        )}

        {!showResult && (
          <Button 
            onClick={handleCheck} 
            disabled={!userInput.trim()}
            className="w-full"
          >
            Check Answer
          </Button>
        )}
      </div>
    </Card>
  );
}