import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { flashcardsAPI } from '../services/api';
import './FlashcardsPage.css';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  difficulty: string;
  knowCount: number;
  dontKnowCount: number;
}

const FlashcardsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [knownCards, setKnownCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'study' | 'review'>('study');

  useEffect(() => {
    loadFlashcards();
  }, [subjectId]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      const endpoint = mode === 'study' 
        ? flashcardsAPI.getForStudy(subjectId!)
        : flashcardsAPI.getBySubject(subjectId!);
      
      const response = await endpoint;
      if (response.data.success) {
        setFlashcards(response.data.flashcards);
        setCurrentCard(0);
        setShowAnswer(false);
        setKnownCards([]);
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % flashcards.length);
    setShowAnswer(false);
  };

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setShowAnswer(false);
  };

  const markAsKnown = async () => {
    if (flashcards.length === 0) return;
    
    const currentFlashcard = flashcards[currentCard];
    try {
      await flashcardsAPI.markAsKnown(currentFlashcard._id);
      if (!knownCards.includes(currentFlashcard._id)) {
        setKnownCards([...knownCards, currentFlashcard._id]);
      }
      nextCard();
    } catch (error) {
      console.error('Error marking as known:', error);
    }
  };

  const markAsUnknown = async () => {
    if (flashcards.length === 0) return;
    
    const currentFlashcard = flashcards[currentCard];
    try {
      await flashcardsAPI.markAsUnknown(currentFlashcard._id);
      nextCard();
    } catch (error) {
      console.error('Error marking as unknown:', error);
    }
  };

  const getProgress = () => {
    if (flashcards.length === 0) return 0;
    return Math.round((knownCards.length / flashcards.length) * 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="flashcards-page">
        <Header />
        <div className="loading">Загрузка карточек...</div>
      </div>
    );
  }

  return (
    <div className="flashcards-page">
      <Header />
      
      <div className="flashcards-container">
        <div className="page-header">
          <h1>Карточки для запоминания</h1>
          <p>
            {mode === 'study' ? 'Режим изучения' : 'Режим повторения'} • 
            Прогресс: {getProgress()}%
          </p>
          
          <div className="mode-switcher">
            <button 
              className={`mode-btn ${mode === 'study' ? 'active' : ''}`}
              onClick={() => setMode('study')}
            >
              Изучение
            </button>
            <button 
              className={`mode-btn ${mode === 'review' ? 'active' : ''}`}
              onClick={() => setMode('review')}
            >
              Все карточки
            </button>
          </div>
        </div>

        {flashcards.length === 0 ? (
          <div className="no-cards">
            <h3>Нет карточек для изучения</h3>
            <p>Все карточки изучены или карточки еще не созданы</p>
            <Link to="/dashboard" className="btn-primary">
              Назад к предметам
            </Link>
          </div>
        ) : (
          <>
            <div className="flashcard-content">
              <div className="flashcard">
                <div className="card-counter">
                  Карточка {currentCard + 1} из {flashcards.length}
                  {knownCards.includes(flashcards[currentCard]._id) && ' ✓'}
                  <span 
                    className="difficulty-badge"
                    style={{ backgroundColor: getDifficultyColor(flashcards[currentCard].difficulty) }}
                  >
                    {flashcards[currentCard].difficulty}
                  </span>
                </div>
                
                <div className="card-content">
                  <div className="card-front">
                    <h3>Вопрос:</h3>
                    <p>{flashcards[currentCard].question}</p>
                  </div>
                  
                  {showAnswer && (
                    <div className="card-back">
                      <h3>Ответ:</h3>
                      <p>{flashcards[currentCard].answer}</p>
                    </div>
                  )}
                </div>

                <div className="card-actions">
                  {!showAnswer ? (
                    <button 
                      className="btn-primary"
                      onClick={() => setShowAnswer(true)}
                    >
                      Показать ответ
                    </button>
                  ) : (
                    <div className="answer-actions">
                      <button className="btn-success" onClick={markAsKnown}>
                        Знаю ✓
                      </button>
                      <button className="btn-warning" onClick={markAsUnknown}>
                        Не знаю ✗
                      </button>
                    </div>
                  )}
                </div>

                <div className="navigation-actions">
                  <button onClick={prevCard} className="btn-outline">
                    ← Назад
                  </button>
                  <button onClick={nextCard} className="btn-outline">
                    Вперед →
                  </button>
                </div>
              </div>
            </div>

            <div className="progress-info">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${getProgress()}%` }}
                ></div>
              </div>
              <p>Изучено: {knownCards.length} из {flashcards.length} карточек</p>
            </div>
          </>
        )}

        <div className="page-actions">
          <Link to="/dashboard" className="btn-outline">
            ← Назад к предметам
          </Link>
          <button onClick={loadFlashcards} className="btn-outline">
            Обновить карточки
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardsPage;
