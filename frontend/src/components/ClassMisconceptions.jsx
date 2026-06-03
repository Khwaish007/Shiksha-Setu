import React from 'react';
import { motion } from 'framer-motion';

const ClassMisconceptions = ({ misconceptions }) => {
  if (!misconceptions || misconceptions.length === 0) {
    return (
      <div className="content-section">
        <h2>Top Class Misconceptions</h2>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', opacity: 0.5 }}>🧬</span>
          <p>No class-wide misconception patterns identified yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-section">
      <div className="section-header">
        <h2 className="section-title">Class-Wide Error DNA</h2>
        <p className="section-description">
          Top 5 persistent misconceptions across all students. Use this to guide your next group lesson plan.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
        {misconceptions.map((dna, index) => (
          <motion.div 
            key={index}
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: `1px solid ${dna.severity === 'major' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {dna.severity === 'major' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                backgroundColor: '#ef4444'
              }} />
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ 
                  display: 'inline-block',
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>
                  {dna.concept}
                </span>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem', fontWeight: '500' }}>
                  "{dna.misconception}"
                </h3>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: dna.severity === 'major' ? '#fca5a5' : '#e2e8f0' }}>
                  {dna.studentsAffectedCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Students Affected</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Occurred <strong>{dna.occurrences}</strong> times total in class.
              </span>
              
              <button 
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#e2e8f0',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
                onClick={() => alert(`Lesson plan generation for "${dna.concept}" coming soon!`)}
              >
                Generate Lesson Plan
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ClassMisconceptions;
