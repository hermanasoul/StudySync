import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import './FlashcardsPage.css';

const FlashcardsPage: React.FC = () => {
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [knownCards, setKnownCards] = useState<number[]>([]);

  // Демо-карточки
  const flashcards = [
    { id: 1, question: 'Что такое фотосинтез?', answer: 'Процесс преобразования света в химическую энергию растениями' },
    { id: 2, question: 'Какие органеллы участвуют в фотосинтезе?', answer: 'Хлоропласты' },
    { id: 3, question: 'Какие газы участвуют в фотосинтезе?', answer: 'CO₂ поглощается, O₂ выделяется' }
  ];

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % flashcards.length);
    setShowAnswer(false);
  };

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setShowAnswer(false);
  };

  const markAsKnown = () => {
    if (!knownCards.includes(flashcards[currentCard].id)) {
      setKnownCards([...knownCards, flashcards[currentCard].id]);
    }
    nextCard();
  };

  const markAsUnknown = () => {
    nextCard();
  };

  const getProgress = () => {
    return Math.round((knownCards.length / flashcards.length) * 100);
  };

  return (
    <div className="flashcards-page">
      <Header />
      
      <div className="flashcards-container">
        <div className="page-header">
          <h1>Карточки для запоминания</h1>
          <p>Изучайте материал с помощью флеш-карточек • Прогресс: {getProgress()}%</p>
        </div>

        <div className="flashcard-content">
          <div className="flashcard">
            <div className="card-counter">
              Карточка {currentCard + 1} из {flashcards.length}
              {knownCards.includes(flashcards[currentCard].id) && ' ✓'}
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

        <div className="page-actions">
          <Link to="/dashboard" className="btn-outline">
            ← Назад к предметам
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FlashcardsPage;
