// client/src/pages/FlashcardsPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import CreateFlashcardModal from '../components/CreateFlashcardModal';
import EditFlashcardModal from '../components/EditFlashcardModal';
import StudyCompleteModal from '../components/StudyCompleteModal';
import webSocketService from '../services/websocket';
import { flashcardsAPI } from '../services/api';
import './FlashcardsPage.css';
import '../App.css';

interface Flashcard {
  _id: string;
  question: string;
  answer: string;
  hint?: string;
  subjectId: string;
  known: boolean;
}

const FlashcardsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'view' | 'study'>('view');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStudyComplete, setShowStudyComplete] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studiedCards, setStudiedCards] = useState<string[]>([]);

  useEffect(() => {
    loadFlashcards();
  }, [subjectId, mode]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);
      let response;
      
      if (mode === 'study') {
        response = await flashcardsAPI.getForStudy(subjectId!);
      } else {
        response = await flashcardsAPI.getBySubject(subjectId!);
      }
      
      if (response.data.success) {
        setFlashcards(response.data.flashcards || []);
        setCurrentCard(0);
        setShowAnswer(false);
        setStudiedCards([]);
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
      setFlashcards([]);
    } finally {
      setLoading(false);
    }
  };

  // WebSocket эффекты
  useEffect(() => {
    if (subjectId && mode === 'study') {
      // Отправляем событие активности
      webSocketService.sendUserActivity(subjectId, null, 'studying_flashcards');
      
      // Подписываемся на обновления карточек
      const handleFlashcardUpdated = (data: any) => {
        if (data.subjectId === subjectId) {
          // Можно обновить UI или показать уведомление
          console.log(`Карточка ${data.flashcardId} обновлена пользователем ${data.studiedBy.name}`);
        }
      };
      
      webSocketService.on('flashcard-updated', handleFlashcardUpdated);
      
      return () => {
        webSocketService.off('flashcard-updated', handleFlashcardUpdated);
      };
    }
  }, [subjectId, mode]);

  const handleCreateFlashcard = async () => {
    loadFlashcards();
  };

  const handleEditFlashcard = async () => {
    loadFlashcards();
  };

  const handleDeleteFlashcard = async () => {
    loadFlashcards();
  };

  const handleKnow = async () => {
    const currentFlashcard = flashcards[currentCard];
    try {
      await flashcardsAPI.markAsKnown(currentFlashcard._id);
      
      // Отправляем WebSocket событие
      webSocketService.sendFlashcardStudied(
        currentFlashcard._id,
        subjectId!,
        true
      );
      
      if (!studiedCards.includes(currentFlashcard._id)) {
        setStudiedCards([...studiedCards, currentFlashcard._id]);
      }
      nextCard();
    } catch (error) {
      console.error('Error marking as known:', error);
      nextCard();
    }
  };

  const handleDontKnow = async () => {
    const currentFlashcard = flashcards[currentCard];
    try {
      await flashcardsAPI.markAsUnknown(currentFlashcard._id);
      
      // Отправляем WebSocket событие
      webSocketService.sendFlashcardStudied(
        currentFlashcard._id,
        subjectId!,
        false
      );
      
      if (!studiedCards.includes(currentFlashcard._id)) {
        setStudiedCards([...studiedCards, currentFlashcard._id]);
      }
      nextCard();
    } catch (error) {
      console.error('Error marking as unknown:', error);
      nextCard();
    }
  };

  const nextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setShowAnswer(false);
    } else {
      setShowStudyComplete(true);
    }
  };

  const startStudy = () => {
    setMode('study');
  };

  const exitStudy = () => {
    setMode('view');
    setShowStudyComplete(false);
  };

  const restartStudy = () => {
    setCurrentCard(0);
    setShowAnswer(false);
    setStudiedCards([]);
    setShowStudyComplete(false);
  };

  if (loading) {
    return (
      <div className="flashcards-page">
        <Header />
        <div className="page-with-header">
          <div className="loading">Загрузка карточек...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcards-page">
      <Header />
      <div className="page-with-header">
        <div className="flashcards-container">
          <div className="flashcards-header">
            <h1>Карточки</h1>
            <div className="flashcards-actions">
              {mode === 'view' && (
                <>
                  <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Создать карточку
                  </button>
                  {flashcards.length > 0 && (
                    <button className="btn btn-success" onClick={startStudy}>
                      🎯 Начать изучение
                    </button>
                  )}
                </>
              )}
              {mode === 'study' && (
                <button className="btn btn-outline" onClick={exitStudy}>
                  ← Вернуться к просмотру
                </button>
              )}
            </div>
          </div>

          {mode === 'view' && (
            <>
              {flashcards.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <h3>Пока нет карточек</h3>
                  <p>Создайте первую карточку для изучения</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setShowCreateModal(true)}
                  >
                    Создать карточку
                  </button>
                </div>
              ) : (
                <div className="flashcards-grid">
                  {flashcards.map((flashcard) => (
                    <div key={flashcard._id} className="flashcard-card">
                      <div className="flashcard-content">
                        <div className="flashcard-question">
                          <h3>{flashcard.question}</h3>
                          {flashcard.hint && (
                            <div className="flashcard-hint">
                              💡 {flashcard.hint}
                            </div>
                          )}
                        </div>
                        <div className="flashcard-answer">
                          <p>{flashcard.answer}</p>
                        </div>
                      </div>
                      <div className="flashcard-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => {
                            setEditingFlashcard(flashcard);
                            setShowEditModal(true);
                          }}
                        >
                          Редактировать
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => {
                            setEditingFlashcard(flashcard);
                            handleDeleteFlashcard();
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {mode === 'study' && flashcards.length > 0 && (
            <div className="study-mode">
              <div className="study-progress">
                Прогресс: {currentCard + 1} / {flashcards.length}
              </div>
              
              <div className="flashcard-study">
                <div className="study-card">
                  <div className="card-question">
                    <h2>{flashcards[currentCard].question}</h2>
                    {flashcards[currentCard].hint && (
                      <div className="card-hint">
                        💡 Подсказка: {flashcards[currentCard].hint}
                      </div>
                    )}
                  </div>

                  {showAnswer && (
                    <div className="card-answer">
                      <h3>Ответ:</h3>
                      <p>{flashcards[currentCard].answer}</p>
                    </div>
                  )}

                  <div className="study-actions">
                    {!showAnswer ? (
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowAnswer(true)}
                      >
                        Показать ответ
                      </button>
                    ) : (
                      <div className="knowledge-actions">
                        <button 
                          className="btn btn-success"
                          onClick={handleKnow}
                        >
                          Знаю ✅
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={handleDontKnow}
                        >
                          Не знаю ❌
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateFlashcardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onFlashcardCreated={handleCreateFlashcard}
        subjectId={subjectId!}
      />

      <EditFlashcardModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingFlashcard(null);
        }}
        flashcard={editingFlashcard}
        onFlashcardUpdated={handleEditFlashcard}
        onFlashcardDeleted={handleDeleteFlashcard}
      />

      <StudyCompleteModal
        isOpen={showStudyComplete}
        onClose={exitStudy}
        studiedCount={studiedCards.length}
        totalCount={flashcards.length}
        onRestart={restartStudy}
        mode="flashcards"
      />
    </div>
  );
};

export default FlashcardsPage;
