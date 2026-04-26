// client/src/pages/FlashcardsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  const validSubjectId = subjectId && subjectId !== 'undefined' ? subjectId : null;

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
  const [error, setError] = useState<string | null>(null);

  const loadFlashcards = useCallback(async () => {
    if (!validSubjectId) return;
    try {
      setLoading(true);
      let response;
      if (mode === 'study') {
        response = await flashcardsAPI.getForStudy(validSubjectId);
      } else {
        response = await flashcardsAPI.getBySubject(validSubjectId);
      }
      if (response.data.success) {
        const cards = (response.data.flashcards || []).map((c: any) => ({
          ...c,
          _id: c.id || c._id,
        }));
        setFlashcards(cards);
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
  }, [validSubjectId, mode]);

  useEffect(() => {
    if (validSubjectId) loadFlashcards();
    else setLoading(false);
  }, [validSubjectId, mode, loadFlashcards]);

  useEffect(() => {
    if (validSubjectId && mode === 'study') {
      webSocketService.sendUserActivity(validSubjectId, null, 'studying_flashcards');
      const handleFlashcardUpdated = (data: any) => {
        if (data.subjectId === validSubjectId) console.log(`Карточка обновлена`);
      };
      webSocketService.on('flashcard-updated', handleFlashcardUpdated);
      return () => { webSocketService.off('flashcard-updated', handleFlashcardUpdated); };
    }
  }, [validSubjectId, mode]);

  if (!validSubjectId) {
    return (
      <div className="flashcards-page">
        <Header />
        <div className="page-with-header">
          <div className="error-message">
            Предмет не указан. <Link to="/subjects" className="btn btn-primary" style={{ marginLeft: '1rem' }}>Выбрать предмет</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateFlashcard = () => loadFlashcards();

  const handleEditFlashcard = (updatedFlashcard?: Flashcard) => {
    if (updatedFlashcard) {
      setFlashcards(prev => prev.map(c => c._id === updatedFlashcard._id ? { ...c, ...updatedFlashcard } : c));
    } else {
      loadFlashcards();
    }
    setShowEditModal(false);
    setEditingFlashcard(null);
  };

  const handleDeleteFlashcard = async () => {
    if (!editingFlashcard) return;
    try {
      await flashcardsAPI.delete(editingFlashcard._id);
      setFlashcards(prev => prev.filter(c => c._id !== editingFlashcard._id));
      setShowEditModal(false);
      setEditingFlashcard(null);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      setError('Ошибка при удалении карточки');
    }
  };

  const handleKnow = async () => {
    const card = flashcards[currentCard];
    try {
      await flashcardsAPI.markAsKnown(card._id);
      webSocketService.sendFlashcardStudied(card._id, validSubjectId!, true);
      if (!studiedCards.includes(card._id)) setStudiedCards([...studiedCards, card._id]);
      nextCard();
    } catch (error) {
      console.error(error);
      nextCard();
    }
  };

  const handleDontKnow = async () => {
    const card = flashcards[currentCard];
    try {
      await flashcardsAPI.markAsUnknown(card._id);
      webSocketService.sendFlashcardStudied(card._id, validSubjectId!, false);
      if (!studiedCards.includes(card._id)) setStudiedCards([...studiedCards, card._id]);
      nextCard();
    } catch (error) {
      console.error(error);
      nextCard();
    }
  };

  const nextCard = () => {
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setShowStudyComplete(true);
    }
  };

  const startStudy = () => setMode('study');
  const exitStudy = () => { setMode('view'); setShowStudyComplete(false); };
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
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}
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
                  <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    Создать карточку
                  </button>
                </div>
              ) : (
                <div className="flashcards-grid">
                  {flashcards.map(card => (
                    <div key={card._id} className="flashcard-card">
                      <div className="flashcard-content">
                        <div className="flashcard-question">
                          <h3>{card.question}</h3>
                          {card.hint && <div className="flashcard-hint">💡 {card.hint}</div>}
                        </div>
                        <div className="flashcard-answer">
                          <p>{card.answer}</p>
                        </div>
                      </div>
                      <div className="flashcard-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() => { setEditingFlashcard(card); setShowEditModal(true); }}
                        >
                          Редактировать
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => { setEditingFlashcard(card); handleDeleteFlashcard(); }}
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
                      <div className="card-hint">💡 Подсказка: {flashcards[currentCard].hint}</div>
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
                      <button className="btn btn-primary" onClick={() => setShowAnswer(true)}>
                        Показать ответ
                      </button>
                    ) : (
                      <div className="knowledge-actions">
                        <button className="btn btn-success" onClick={handleKnow}>Знаю ✅</button>
                        <button className="btn btn-danger" onClick={handleDontKnow}>Не знаю ❌</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateFlashcardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onFlashcardCreated={handleCreateFlashcard}
          subjectId={validSubjectId}
        />
      )}
      {editingFlashcard && (
        <EditFlashcardModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditingFlashcard(null); }}
          flashcard={editingFlashcard}
          onFlashcardUpdated={handleEditFlashcard}
          onFlashcardDeleted={handleDeleteFlashcard}
        />
      )}
      {showStudyComplete && (
        <StudyCompleteModal
          isOpen={showStudyComplete}
          onClose={exitStudy}
          studiedCount={studiedCards.length}
          totalCount={flashcards.length}
          onRestart={restartStudy}
          mode="flashcards"
        />
      )}
    </div>
  );
};

export default FlashcardsPage;