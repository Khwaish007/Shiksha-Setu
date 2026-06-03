import React from 'react';
import { motion } from 'framer-motion';
import '../styles/ErrorDNA.css';

const ErrorDNA = ({ errorDNA }) => {
  if (!errorDNA || errorDNA.length === 0) {
    return (
      <div className="error-dna-empty">
        <span className="dna-icon">🧬</span>
        <p>No error patterns identified yet.</p>
      </div>
    );
  }

  // Sort by occurrences descending
  const sortedDNA = [...errorDNA].sort((a, b) => b.occurrences - a.occurrences);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="error-dna-container">
      <div className="dna-strand-line"></div>
      
      <div className="dna-cards">
        {sortedDNA.map((dna, index) => (
          <motion.div 
            key={index}
            className={`dna-card ${dna.severity === 'major' ? 'severity-major' : 'severity-minor'}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="dna-node"></div>
            <div className="dna-card-content">
              <div className="dna-card-header">
                <h4 className="dna-concept">{dna.concept}</h4>
                <span className="dna-badge">{dna.occurrences}x</span>
              </div>
              <p className="dna-misconception">"{dna.misconception}"</p>
              <div className="dna-footer">
                <span className="dna-dates">
                  {formatDate(dna.firstSeen)} → {formatDate(dna.lastSeen)}
                </span>
                {dna.severity === 'major' && <span className="dna-severity-tag">Major Blocker</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ErrorDNA;
