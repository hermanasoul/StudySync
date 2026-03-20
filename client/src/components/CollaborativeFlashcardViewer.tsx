// client/src/components/CollaborativeFlashcardViewer.tsx

import React, { useState, useEffect } from 'react';
import './CollaborativeFlashcardViewer.css';

// Локальный интерфейс для карточки (без привязки к серверной модели)
interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  difficulty: string;
}

interface CollaborativeFlashcardViewerProps {
  flashcards: Array<{
    flashcardId: Flashcard;
    reviewedBy: Array<{
      user: string;
      isCorrect: boolean;
      reviewedAt: string;
    }>;
  }>;
  currentIndex: number;
  studyMode: 'collaborative' | 'individual' | 'host-controlled';
  isHost: boolean;
  userId: string;
  onAnswer: (flashcardId: string, isCorrect: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onJump?: (index: number) => void;
  disabled?: boolean;
}

const CollaborativeFlashcardViewer: React.FC<CollaborativeFlashcardViewerProps> = ({
  flashcards,
  currentIndex,
  studyMode,
  isHost,
  userId,
  onAnswer,
  onNext,
  onPrevious,
  onJump,
  disabled = false
}) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  const currentFlashcard = flashcards[currentIndex]?.flashcardId;
  const currentReviews = flashcards[currentIndex]?.reviewedBy || [];
  const userHasAnswered = currentReviews.some(r => r.user === userId);

  useEffect(() => {
    setShowAnswer(false);
  }, [currentIndex]);

  const handleFlip = () => {
    if (disabled) return;
    setIsFlipping(true);
    setShowAnswer(!showAnswer);
    setTimeout(() => setIsFlipping(false), 300);
  };

  const handleAnswer = (isCorrect: boolean) => {
    if (disabled || userHasAnswered) return;
    if (!currentFlashcard) return;
    onAnswer(currentFlashcard._id, isCorrect);
    
    if (studyMode === 'collaborative') {
      setTimeout(() => onNext(), 500);
    }
  };

  const handleNext = () => {
    if (disabled) return;
    if (studyMode === 'host-controlled' && !isHost) return;
    onNext();
  };

  const handlePrevious = () => {
    if (disabled) return;
    if (studyMode === 'host-controlled' && !isHost) return;
    onPrevious();
  };

  const handleJump = (index: number) => {
    if (disabled) return;
    if (studyMode === 'host-controlled' && !isHost) return;
    if (onJump) onJump(index);
  };

  const getStats = () => {
    const total = flashcards.length;
    const reviewed = flashcards.filter(f => f.reviewedBy.length > 0).length;
    const correct = flashcards.reduce((sum, f) => 
      sum + f.reviewedBy.filter(r => r.isCorrect).length, 0
    );
    const incorrect = flashcards.reduce((sum, f) => 
      sum + f.reviewedBy.filter(r => !r.isCorrect).length, 0
    );
    return { total, reviewed, correct, incorrect };
  };

  const stats = getStats();

  if (!currentFlashcard) {
    return (
      <div className="flashcard-empty">
        <div className="empty-icon">🃏</div>
        <h3>Нет карточек для изучения</h3>
        <p>Добавьте карточки в сессию, чтобы начать изучение</p>
      </div>
    );
  }

  const isFlippable = studyMode !== 'host-controlled' || isHost;

  return (
    <div className="collaborative-flashcard-viewer">
      <div className="flashcard-stats">
        <div className="stat">
          <span className="stat-value">{currentIndex + 1}</span>
          <span className="stat-label">/ {stats.total}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.reviewed}</span>
          <span className="stat-label">изучено</span>
        </div>
        <div className="stat success">
          <span className="stat-value">{stats.correct}</span>
          <span className="stat-label">верно</span>
        </div>
        <div className="stat error">
          <span className="stat-value">{stats.incorrect}</span>
          <span className="stat-label">неверно</span>
        </div>
      </div>

      <div className={`flashcard-container ${isFlipping ? 'flipping' : ''}`}>
        <div className={`flashcard ${showAnswer ? 'flipped' : ''}`}>
          <div className="flashcard-front" onClick={isFlippable ? handleFlip : undefined}>
            <div className="flashcard-content">
              <div className="flashcard-label">Вопрос</div>
              <div className="flashcard-text">{currentFlashcard.question}</div>
              {currentFlashcard.hint && (
                <div className="flashcard-hint">💡 {currentFlashcard.hint}</div>
              )}
            </div>
          </div>
          <div className="flashcard-back" onClick={isFlippable ? handleFlip : undefined}>
            <div className="flashcard-content">
              <div className="flashcard-label">Ответ</div>
              <div className="flashcard-text">{currentFlashcard.answer}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flashcard-controls">
        <button
          className="control-btn prev"
          onClick={handlePrevious}
          disabled={disabled || currentIndex === 0 || (studyMode === 'host-controlled' && !isHost)}
        >
          ← Предыдущая
        </button>
        
        <div className="answer-buttons">
          {!userHasAnswered && showAnswer && (
            <>
              <button
                className="answer-btn incorrect"
                onClick={() => handleAnswer(false)}
                disabled={disabled}
              >
                ❌ Не знаю
              </button>
              <button
                className="answer-btn correct"
                onClick={() => handleAnswer(true)}
                disabled={disabled}
              >
                ✅ Знаю
              </button>
            </>
          )}
          {userHasAnswered && (
            <div className="answered-badge">
              ✓ Вы уже ответили на эту карточку
            </div>
          )}
        </div>

        <button
          className="control-btn next"
          onClick={handleNext}
          disabled={disabled || currentIndex === flashcards.length - 1 || (studyMode === 'host-controlled' && !isHost)}
        >
          Следующая →
        </button>
      </div>

      {studyMode === 'host-controlled' && !isHost && (
        <div className="viewer-hint">
          Ведущий управляет карточками. Следуйте за его выбором.
        </div>
      )}

      {flashcards.length > 5 && (
        <div className="flashcard-thumbnails">
          {flashcards.map((_, idx) => (
            <button
              key={idx}
              className={`thumbnail ${idx === currentIndex ? 'active' : ''} ${
                flashcards[idx].reviewedBy.length > 0 ? 'reviewed' : ''
              }`}
              onClick={() => handleJump(idx)}
              disabled={studyMode === 'host-controlled' && !isHost}
              title={`Карточка ${idx + 1}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollaborativeFlashcardViewer;