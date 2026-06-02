import { useState } from 'react';
import { motion } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';

const CreateStudentModal = ({ onClose, onStudentCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a student name.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const newStudent = await analyticsAPI.createStudent(name.trim());
      onStudentCreated(newStudent);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create student.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="csm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(8, 12, 24, 0.92))',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 32px 80px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(32px)',
        }}
      >
        <div style={{ marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: '0.72rem', color: 'rgba(248, 250, 252, 0.5)' }}>
          New Profile
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px', letterSpacing: '-0.03em' }}>
          Create Student
        </h2>
        <p style={{ fontSize: '0.88rem', color: 'rgba(203, 213, 225, 0.7)', marginBottom: '28px', lineHeight: 1.5 }}>
          Add a new student to begin tracking their individual test performance over time.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
            Student Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="e.g. Rohan Sharma"
            autoFocus
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${error ? 'rgba(251, 113, 133, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '14px',
              color: '#f8fafc',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.25s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { if (!error) e.target.style.borderColor = 'rgba(125, 211, 252, 0.4)'; }}
            onBlur={(e) => { if (!error) e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
          />

          {error && (
            <p style={{ color: '#fb7185', fontSize: '0.82rem', marginTop: '8px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px 0',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#cbd5e1',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1.5,
                padding: '13px 0',
                borderRadius: '14px',
                border: 'none',
                background: loading
                  ? 'rgba(125, 211, 252, 0.3)'
                  : 'linear-gradient(135deg, rgba(125, 211, 252, 0.9), rgba(167, 139, 250, 0.9))',
                color: '#fff',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(125, 211, 252, 0.2)',
              }}
            >
              {loading ? 'Creating…' : 'Create Student'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default CreateStudentModal;
