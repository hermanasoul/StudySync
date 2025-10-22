import React, { useState } from 'react';
import './CreateNoteModal.css';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (noteData: { title: string; content: string; tags: string[] }) => void;
  subjectId: string;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  subjectId
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    await onSubmit({
      title: formData.title,
      content: formData.content,
      tags: tagsArray
    });

    setLoading(false);
    setFormData({ title: '', content: '', tags: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Создать заметку</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="note-form">
          <div className="form-group">
            <label htmlFor="title">Заголовок</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Введите заголовок заметки"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Содержание</label>
            <textarea
              id="content"
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
            <label htmlFor="tags">Теги (через запятую)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="биология, клетки, ДНК"
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Создание...' : 'Создать заметку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNoteModal;
