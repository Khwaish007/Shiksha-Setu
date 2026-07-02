import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useI18n } from '../i18n.jsx';
import LessonPlanModal from './LessonPlanModal';

const ClassMisconceptions = ({ misconceptions, sessionId }) => {
  const { t } = useI18n();
  const [activeMisconception, setActiveMisconception] = useState(null);
  const [generatingIndex, setGeneratingIndex] = useState(null);

  if (!misconceptions || misconceptions.length === 0) {
    return (
      <div className="content-section">
        <h2>{t('topClassMisconceptions')}</h2>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem', opacity: 0.5 }}>🧬</span>
          <p>{t('noClassMisconceptions')}</p>
        </div>
      </div>
    );
  }

  const handleGenerate = (dna, index) => {
    setGeneratingIndex(index);
    setActiveMisconception(dna);
  };

  return (
    <div className="content-section">
      <AnimatePresence>
        {activeMisconception && (
          <LessonPlanModal
            misconception={activeMisconception}
            sessionId={sessionId}
            onClose={() => {
              setActiveMisconception(null);
              setGeneratingIndex(null);
            }}
          />
        )}
      </AnimatePresence>

      <div className="section-header">
        <h2 className="section-title">{t('classWideErrorDna')}</h2>
        <p className="section-description">
          {t('errorDnaDescription')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
        {misconceptions.map((dna, index) => (
          <div
            key={`${dna.concept}-${index}`}
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: `1px solid ${dna.severity === 'major' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {dna.severity === 'major' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                backgroundColor: '#ef4444',
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
                  marginBottom: '0.5rem',
                }}>
                  {dna.concept}
                </span>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.1rem', fontWeight: '500' }}>
                  &ldquo;{dna.misconception}&rdquo;
                </h3>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: dna.severity === 'major' ? '#fca5a5' : '#e2e8f0' }}>
                  {dna.studentsAffectedCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{t('studentsAffected')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                {t('occurred')} <strong>{dna.occurrences}</strong> {t('timesTotalInClass')}
              </span>

              <button
                type="button"
                style={{
                  background: generatingIndex === index ? 'rgba(99, 102, 241, 0.2)' : 'none',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  color: '#a5b4fc',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: generatingIndex === index ? 'wait' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                }}
                onClick={() => handleGenerate(dna, index)}
                disabled={generatingIndex === index}
              >
                {generatingIndex === index ? t('generatingLessonPlan') : `📋 ${t('generateLessonPlan')}`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassMisconceptions;
