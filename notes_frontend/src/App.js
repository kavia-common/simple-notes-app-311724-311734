import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const DEFAULT_API_BASE_URL = 'http://localhost:3001';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL;

// PUBLIC_INTERFACE
function App() {
  /** Simple notes app UI (no auth). */
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // {id, title, content} | null
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');

  const isEditing = useMemo(() => Boolean(editingNote?.id), [editingNote]);

  const openCreate = useCallback(() => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setError('');
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((note) => {
    setEditingNote(note);
    setFormTitle(note.title || '');
    setFormContent(note.content || '');
    setError('');
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (saving) return;
    setIsModalOpen(false);
  }, [saving]);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/notes`);
      if (!res.ok) {
        throw new Error(`Failed to load notes (${res.status})`);
      }
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const submitForm = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    const title = formTitle.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_BASE_URL}/notes/${editingNote.id}` : `${API_BASE_URL}/notes`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: formContent }),
      });

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => null);
        const msg = maybeJson?.detail ? String(maybeJson.detail) : `Request failed (${res.status})`;
        throw new Error(msg);
      }

      await fetchNotes();
      setIsModalOpen(false);
    } catch (e2) {
      setError(e2?.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  }, [editingNote, fetchNotes, formContent, formTitle, isEditing]);

  const deleteNote = useCallback(async (noteId) => {
    setError('');
    const confirmed = window.confirm('Delete this note?');
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/notes/${noteId}`, { method: 'DELETE' });
      if (res.status !== 204) {
        const maybeJson = await res.json().catch(() => null);
        const msg = maybeJson?.detail ? String(maybeJson.detail) : `Delete failed (${res.status})`;
        throw new Error(msg);
      }
      await fetchNotes();
    } catch (e) {
      setError(e?.message || 'Failed to delete note.');
    }
  }, [fetchNotes]);

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div>
            <h1 className="title">Notes</h1>
            <p className="subtitle">A simple CRUD notes app</p>
          </div>

          <button className="btn btn--primary" onClick={openCreate}>
            New note
          </button>
        </div>
      </header>

      <main className="container">
        {error ? (
          <div className="alert" role="alert">
            <strong>Oops:</strong> <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="status">Loading notes…</div>
        ) : notes.length === 0 ? (
          <div className="empty">
            <div className="empty__card">
              <h2>No notes yet</h2>
              <p>Create your first note to get started.</p>
              <button className="btn btn--primary" onClick={openCreate}>
                Create note
              </button>
            </div>
          </div>
        ) : (
          <div className="grid" role="list" aria-label="Notes list">
            {notes.map((n) => (
              <article className="card" key={n.id} role="listitem">
                <div className="card__top">
                  <h3 className="card__title">{n.title}</h3>
                  <div className="card__actions">
                    <button className="iconbtn" onClick={() => openEdit(n)} aria-label={`Edit ${n.title}`}>
                      Edit
                    </button>
                    <button className="iconbtn iconbtn--danger" onClick={() => deleteNote(n.id)} aria-label={`Delete ${n.title}`}>
                      Delete
                    </button>
                  </div>
                </div>

                {n.content ? (
                  <p className="card__content">{n.content}</p>
                ) : (
                  <p className="card__content card__content--muted">No content</p>
                )}

                <div className="card__meta">
                  <span>Updated {new Date(n.updated_at).toLocaleString()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <button className="fab" onClick={openCreate} aria-label="Create note">
        +
      </button>

      {isModalOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={isEditing ? 'Edit note' : 'Create note'}>
          <div className="modal">
            <div className="modal__header">
              <h2 className="modal__title">{isEditing ? 'Edit note' : 'New note'}</h2>
              <button className="iconbtn" onClick={closeModal} aria-label="Close dialog">
                ✕
              </button>
            </div>

            <form onSubmit={submitForm} className="form">
              <label className="field">
                <span className="field__label">Title</span>
                <input
                  className="input"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Grocery list"
                  maxLength={200}
                  autoFocus
                />
              </label>

              <label className="field">
                <span className="field__label">Content</span>
                <textarea
                  className="textarea"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write something…"
                  rows={8}
                />
              </label>

              {error ? (
                <div className="form__error" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="form__actions">
                <button type="button" className="btn" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create note'}
                </button>
              </div>

              <div className="form__hint">
                API: <code>{API_BASE_URL}</code>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
