import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import '../styles/AnswerReplay.css';

const AnswerReplay = ({ studentId, testId, onClose }) => {
  const [replayData, setReplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReplay = async () => {
      try {
        setLoading(true);
        const data = await analyticsAPI.getTestReplay(studentId, testId);
        setReplayData(data);
      } catch (err) {
        console.error("Failed to load replay data", err);
        setError("Could not load the answer replay. Ensure the image was saved.");
      } finally {
        setLoading(false);
      }
    };

    fetchReplay();
  }, [studentId, testId]);

  if (loading) {
    return (
      <div className="replay-modal-overlay">
        <div className="replay-modal-content loading-content">
          <div className="sp-loading-spinner" />
          <p>Generating AI Replay...</p>
        </div>
      </div>
    );
  }

  if (error || !replayData) {
    return (
      <div className="replay-modal-overlay">
        <div className="replay-modal-content error-content">
          <h2>Replay Not Available</h2>
          <p>{error || "No data found."}</p>
          <button onClick={onClose} className="replay-close-btn">Close</button>
        </div>
      </div>
    );
  }

  const { imageBase64, annotations, errorSummary } = replayData;
  const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

  const getColorByStatus = (status) => {
    if (!status) return '#fbbf24'; // default warning orange
    const s = status.toLowerCase();
    if (s.includes('correct')) return '#34d399';
    if (s.includes('wrong') || s.includes('incorrect')) return '#fb7185';
    if (s.includes('consequence')) return '#fbbf24';
    return '#a78bfa'; // unknown
  };

  return (
    <div className="replay-modal-overlay">
      <div className="replay-modal-container">
        <div className="replay-header">
          <h2>AI Answer Replay</h2>
          <button onClick={onClose} className="replay-close-icon">✕</button>
        </div>
        
        <div className="replay-body">
          <div className="replay-image-section">
            <div className="replay-canvas-wrapper">
              <img src={imageUrl} alt="Student Submission" className="replay-image" />
              
              {/* Overlay Markers */}
              {annotations && annotations.map((ann, index) => {
                // Approximate vertical positioning based on step index (assuming downward progression)
                const totalSteps = annotations.length || 1;
                const topPercent = Math.max(10, Math.min(90, (index + 1) * (100 / (totalSteps + 1))));
                
                return (
                  <motion.div
                    key={index}
                    className="replay-marker"
                    style={{
                      top: `${topPercent}%`,
                      left: '10%', // placed on the left side of the paper
                      backgroundColor: getColorByStatus(ann.status)
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.8, type: 'spring' }}
                    onClick={() => setActiveAnnotation(ann)}
                    whileHover={{ scale: 1.2 }}
                  >
                    {ann.step || index + 1}
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          <div className="replay-sidebar">
            <h3>Evaluation Summary</h3>
            <p className="error-summary-text">{errorSummary || "No summary available."}</p>
            
            <div className="annotation-list">
              <h4>Step-by-Step Breakdown</h4>
              <AnimatePresence>
                {annotations && annotations.map((ann, index) => (
                  <motion.div
                    key={index}
                    className={`annotation-card ${activeAnnotation === ann ? 'active-card' : ''}`}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 1 + index * 0.8 }}
                    onClick={() => setActiveAnnotation(ann)}
                  >
                    <div className="annotation-card-header">
                      <span 
                        className="step-badge"
                        style={{ backgroundColor: getColorByStatus(ann.status) }}
                      >
                        Step {ann.step || index + 1}
                      </span>
                      <span className="status-text">{ann.status}</span>
                    </div>
                    {activeAnnotation === ann && (
                      <motion.div 
                        className="annotation-description"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                      >
                        {ann.description}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerReplay;
