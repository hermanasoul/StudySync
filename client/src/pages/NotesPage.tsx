// client/src/pages/NotesPage.tsx

import React, { useState, useEffect } from 'react';
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
  const [error, setError] = useState('');

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('studysync_token');
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };
    return await fetch(`http://localhost:5000/api${endpoint}`, config);
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchWithAuth(`/notes/subject/${subjectId}`);
      const data = await response.json();
      
      if (data.success) {
        setNotes(data.notes);
      } else {
        setError(data.error || 'Failed to load notes');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setError('Network error while loading notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (noteData: { title: string; content: string; tags: string[] }) => {
    try {
      const response = await fetchWithAuth('/notes', {
        method: 'POST',
        body: JSON.stringify({
          ...noteData,
          subjectId: subjectId
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setShowCreateModal(false);
        await loadNotes();
      } else {
        setError(data.error || 'Failed to create note');
      }
    } catch (error) {
      console.error('Error creating note:', error);
      setError('Network error while creating note');
    }
  };

  const handleEditNote = async (noteId: string, noteData: { title: string; content: string; tags: string[] }) => {
    try {
      const response = await fetchWithAuth(`/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify(noteData)
      });
      const data = await response.json();
      
      if (data.success) {
        setShowEditModal(false);
        setSelectedNote(null);
        await loadNotes();
      } else {
        setError(data.error || 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      setError('Network error while updating note');
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    try {
      const response = await fetchWithAuth(`/notes/${selectedNote._id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setShowDeleteModal(false);
        setSelectedNote(null);
        await loadNotes();
      } else {
        setError(data.error || 'Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Network error while deleting note');
    }
  };

  const openEditModal = (note: Note) => {
    setSelectedNote(note);
    setShowEditModal(true);
  };

  const openDeleteModal = (note: Note) => {
    setSelectedNote(note);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedNote(null);
  };

  useEffect(() => {
    if (subjectId) {
      loadNotes();
    }
  }, [subjectId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

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
            <button onClick={() => setError('')} className="error-close">×</button>
          </div>
        )}

        <div className="notes-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Создать заметку
          </button>
        </div>

        <div className="notes-content">
          {notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>Заметок пока нет</h3>
              <p>Создайте свою первую заметку для этого предмета</p>
              <button 
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Создать заметку
              </button>
            </div>
          ) : (
            <div className="notes-grid">
              {notes.map((note) => (
                <div key={note._id} className="note-card">
                  <div className="note-header">
                    <h3 className="note-title">{note.title}</h3>
                    <div className="note-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => openEditModal(note)}
                        title="Редактировать заметку"
                      >
                        ✎
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => openDeleteModal(note)}
                        title="Удалить заметку"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="note-content">
                    {note.content.length > 150 
                      ? `${note.content.substring(0, 150)}...` 
                      : note.content
                    }
                  </div>
                  
                  {note.tags.length > 0 && (
                    <div className="note-tags">
                      {note.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="note-footer">
                    <div className="note-author">
                      Автор: {note.authorId.name}
                    </div>
                    <div className="note-date">
                      {formatDate(note.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="page-actions">
          <Link to="/dashboard" className="btn-outline">
            ← Назад к предметам
          </Link>
        </div>
      </div>

      <CreateNoteModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSubmit={handleCreateNote}
        subjectId={subjectId || ''}
      />

      <EditNoteModal
        isOpen={showEditModal}
        onClose={closeModals}
        onSubmit={handleEditNote}
        note={selectedNote}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={closeModals}
        onConfirm={handleDeleteNote}
        title="Удаление заметки"
        message="Вы уверены, что хотите удалить эту заметку? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
      />
    </div>
  );
};

export default NotesPage;
