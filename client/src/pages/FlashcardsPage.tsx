import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import './FlashcardsPage.css';

const FlashcardsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Демо-карточки
  const flashcards = [
    { question: 'Что такое фотосинтез?', answer: 'Процесс преобразования света в химическую энергию растениями' },
    { question: 'Какие органеллы участвуют в фотосинтезе?', answer: 'Хлоропласты' },
    { question: 'Какие газы участвуют в фотосинтезе?', answer: 'CO₂ поглощается, O₂ выделяется' }
  ];

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % flashcards.length);
    setShowAnswer(false);
  };

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setShowAnswer(false);
  };

  return (
    <div className="flashcards-page">
      <Header />
      
      <div className="flashcards-container">
        <div className="page-header">
          <h1>Карточки для запоминания</h1>
          <p>Изучайте материал с помощью флеш-карточек</p>
        </div>

        <div className="flashcard-content">
          <div className="flashcard">
            <div className="card-counter">
              Карточка {currentCard + 1} из {flashcards.length}
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
                  <button className="btn-success">Знаю ✓</button>
                  <button className="btn-warning">Не знаю ✗</button>
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
