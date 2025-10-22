import React, { useState, useEffect } from 'react';
import './EditNoteModal.css';

interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
}

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteId: string, noteData: { title: string; content: string; tags: string[] }) => void;
  note: Note | null;
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  note
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content,
        tags: note.tags.join(', ')
      });
    }
  }, [note]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;

    setLoading(true);

    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    await onSubmit(note._id, {
      title: formData.title,
      content: formData.content,
      tags: tagsArray
    });

    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleClose = () => {
    setFormData({ title: '', content: '', tags: '' });
    onClose();
  };

  if (!isOpen || !note) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Редактировать заметку</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="note-form">
          <div className="form-group">
            <label htmlFor="edit-title">Заголовок</label>
            <input
              type="text"
              id="edit-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Введите заголовок заметки"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-content">Содержание</label>
            <textarea
              id="edit-content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              placeholder="Введите содержание заметки..."
              rows={8}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-tags">Теги (через запятую)</label>
            <input
              type="text"
              id="edit-tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="биология, клетки, ДНК"
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditNoteModal;
