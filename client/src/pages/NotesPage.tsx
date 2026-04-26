// client/src/pages/NotesPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import CreateNoteModal from '../components/CreateNoteModal';
import EditNoteModal from '../components/EditNoteModal';
import ConfirmModal from '../components/ConfirmModal';
import './NotesPage.css';

interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  authorId: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const NotesPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validSubjectId = subjectId && subjectId !== 'undefined' ? subjectId : null;

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('studysync_token');
    return await fetch(`http://localhost:5000/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  };

  // Надёжное извлечение текста ошибки
  const extractError = (data: any): string => {
    if (typeof data === 'string') return data;
    if (data?.error) {
      if (typeof data.error === 'string') return data.error;
      if (data.error.message) return data.error.message;
      if (data.error.errors) {
        return Object.values(data.error.errors).map((e: any) => e.message).join('; ');
      }
      return JSON.stringify(data.error);
    }
    if (data?.message) return data.message;
    return 'Неизвестная ошибка';
  };

  const loadNotes = useCallback(async () => {
    if (!validSubjectId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth(`/notes/subject/${validSubjectId}`);
      const data = await response.json();
      if (data.success) {
        const normalized = (data.notes || []).map((n: any) => ({
          ...n,
          _id: n._id || n.id,
        }));
        setNotes(normalized);
      } else {
        setError(extractError(data));
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      setError('Сетевая ошибка при загрузке заметок');
    } finally {
      setLoading(false);
    }
  }, [validSubjectId]);

  useEffect(() => {
    if (validSubjectId) loadNotes();
    else setLoading(false);
  }, [validSubjectId, loadNotes]);

  // Создание с мгновенным добавлением
  const handleCreateNote = async (noteData: { title: string; content: string; tags: string[] }) => {
    if (!validSubjectId) return;
    try {
      setError(null);
      const response = await fetchWithAuth('/notes', {
        method: 'POST',
        body: JSON.stringify({ ...noteData, subjectId: validSubjectId }),
      });
      const data = await response.json();
      if (data.success && data.note) {
        const newNote: Note = {
          ...data.note,
          _id: data.note._id,
        };
        setNotes(prev => [newNote, ...prev]);
        setShowCreateModal(false);
      } else {
        setError(extractError(data));
      }
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Сетевая ошибка при создании заметки');
    }
  };

  // Редактирование с ожиданием ответа и локальным обновлением
  const handleEditNote = async (noteId: string, noteData: { title: string; content: string; tags: string[] }) => {
    try {
      setError(null);
      if (!noteId || noteId === 'undefined') { setError('Некорректный ID заметки'); return; }
      const cleanId = String(noteId).trim();
      const response = await fetchWithAuth(`/notes/${cleanId}`, {
        method: 'PUT',
        body: JSON.stringify(noteData),
      });
      const data = await response.json();
      if (data.success && data.note) {
        setNotes(prev => prev.map(n => n._id === data.note._id ? { ...data.note, _id: data.note._id } : n));
        setShowEditModal(false);
        setSelectedNote(null);
      } else {
        setError(extractError(data));
      }
    } catch (err) {
      console.error('Error updating note:', err);
      setError('Сетевая ошибка при обновлении заметки');
    }
  };

  // Удаление с ожиданием ответа и локальным удалением
  const handleDeleteNote = async () => {
    if (!selectedNote?._id) { setError('Не выбрана заметка для удаления'); return; }
    try {
      setError(null);
      const cleanId = String(selectedNote._id).trim();
      const response = await fetchWithAuth(`/notes/${cleanId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setNotes(prev => prev.filter(n => n._id !== selectedNote._id));
        setShowDeleteModal(false);
        setSelectedNote(null);
      } else {
        setError(extractError(data));
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      setError('Сетевая ошибка при удалении заметки');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  if (!validSubjectId) {
    return (
      <div className="notes-page">
        <Header />
        <div className="page-with-header">
          <div className="error-message">
            Предмет не указан. <Link to="/subjects" className="btn btn-primary" style={{ marginLeft: '1rem' }}>Выбрать предмет</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="notes-page">
        <Header />
        <div className="loading">Загрузка заметок...</div>
      </div>
    );
  }

  return (
    <div className="notes-page">
      <Header />
      <div className="notes-container">
        <div className="page-header">
          <h1>Заметки по предмету</h1>
          <p>Создавайте и управляйте своими учебными заметками</p>
        </div>
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}
        <div className="notes-actions">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Создать заметку
          </button>
        </div>
        <div className="notes-content">
          {notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>Заметок пока нет</h3>
              <p>Создайте свою первую заметку для этого предмета</p>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>Создать заметку</button>
            </div>
          ) : (
            <div className="notes-grid">
              {notes.map(note => (
                <div key={note._id} className="note-card">
                  <div className="note-header">
                    <h3 className="note-title">{note.title}</h3>
                    <div className="note-actions">
                      <button className="btn-edit" onClick={() => { setSelectedNote(note); setShowEditModal(true); }}>✎</button>
                      <button className="btn-delete" onClick={() => { setSelectedNote(note); setShowDeleteModal(true); }}>×</button>
                    </div>
                  </div>
                  <div className="note-content">
                    {note.content.length > 150 ? `${note.content.substring(0, 150)}...` : note.content}
                  </div>
                  {note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map((tag, i) => <span key={i} className="tag">#{tag}</span>)}
                    </div>
                  )}
                  <div className="note-footer">
                    <div className="note-author">Автор: {note.authorId.name}</div>
                    <div className="note-date">{formatDate(note.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="page-actions">
          <Link to="/dashboard" className="btn-outline">← Назад к предметам</Link>
        </div>
      </div>

      {showCreateModal && (
        <CreateNoteModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateNote}
          subjectId={validSubjectId}
        />
      )}
      {selectedNote && showEditModal && (
        <EditNoteModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedNote(null); }}
          onSubmit={handleEditNote}
          note={selectedNote}
          onDelete={handleDeleteNote}
        />
      )}
      {selectedNote && showDeleteModal && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => { setShowDeleteModal(false); setSelectedNote(null); }}
          onConfirm={handleDeleteNote}
          title="Удаление заметки"
          message="Вы уверены, что хотите удалить эту заметку? Это действие нельзя отменить."
          confirmText="Удалить"
          cancelText="Отмена"
        />
      )}
    </div>
  );
};

export default NotesPage;