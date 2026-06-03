import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import AnswerReplay from './AnswerReplay';
import ErrorDNA from './ErrorDNA';
import ParentMessageModal from './ParentMessageModal';
import '../styles/StudentProfile.css';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedTests, setExpandedTests] = useState({});
  const [replayTestId, setReplayTestId] = useState(null);
  const [showParentModal, setShowParentModal] = useState(false);

  const fetchStudent = async () => {
    try {
      const data = await analyticsAPI.getStudentById(id);
      setStudent(data);
    } catch (error) {
      console.error('Failed to fetch student:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [id]);

  // ── Computed Values ──────────────────────────────────────────────

  const averageScore = useMemo(() => {
    if (!student?.tests?.length) return 0;
    const sum = student.tests.reduce((a, t) => a + t.score, 0);
    return Math.round(sum / student.tests.length);
  }, [student]);

  const trendData = useMemo(() => {
    if (!student?.tests || student.tests.length < 2) return null;
    const sorted = [...student.tests].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sorted.length < 2) return null;

    // Compare last test vs second-to-last test
    const recent = sorted[sorted.length - 1].score;
    const previous = sorted[sorted.length - 2].score;
    const diff = recent - previous;

    return {
      diff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
      label: diff > 0 ? `+${diff} from last test` : diff < 0 ? `${diff} from last test` : 'No change'
    };
  }, [student]);

  // Struggle Cloud (Legacy) - Kept for fallback if needed
  const struggleCloud = useMemo(() => {
    if (!student?.tests?.length) return [];
    const conceptCounts = {};
    student.tests.forEach(test => {
      test.mistakes.forEach(m => {
        conceptCounts[m.conceptMissed] = (conceptCounts[m.conceptMissed] || 0) + 1;
      });
    });
    return Object.entries(conceptCounts)
      .map(([concept, count]) => ({ concept, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [student]);

  const errorDNA = student?.errorDNA || [];

  // ── Handlers ─────────────────────────────────────────────────────

  const handleUploadTest = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await analyticsAPI.gradeStudentTest(id, file);
      // Refresh student data to show new test
      await fetchStudent();
    } catch (error) {
      console.error('Failed to grade test:', error);
      const message = error.response?.data?.error
        || (error.response?.status === 429
          ? 'AI service is busy. Please wait and try again.'
          : error.response?.status === 413
            ? 'File too large. Try a smaller image.'
            : error.code === 'ECONNABORTED'
              ? 'Grading timed out. Try a smaller image.'
              : 'Failed to process the test. Please try again.');
      alert(message);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleTestExpand = (testId) => {
    setExpandedTests(prev => ({ ...prev, [testId]: !prev[testId] }));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (name) => {
    const parts = name.split(/[\s_]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#7dd3fc';
    if (score >= 40) return '#fbbf24';
    return '#fb7185';
  };

  // ── Loading / Error States ───────────────────────────────────────

  if (loading) {
    return (
      <div className="sp-loading">
        <div className="sp-loading-spinner" />
        <p>Loading student profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="sp-error">
        <h2>Student not found</h2>
        <button onClick={() => navigate('/students')}>← Back to Students</button>
      </div>
    );
  }

  const sortedTests = [...(student.tests || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Score ring percentage (0–100 mapped to circle)
  const scorePercentage = Math.min(100, Math.max(0, averageScore));
  const circumference = 2 * Math.PI * 54; // r=54
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  return (
    <div className="sp-container">
      {replayTestId && (
        <AnswerReplay
          studentId={id}
          testId={replayTestId}
          onClose={() => setReplayTestId(null)}
        />
      )}
      <AnimatePresence>
        {showParentModal && (
          <ParentMessageModal
            student={student}
            onClose={() => setShowParentModal(false)}
          />
        )}
      </AnimatePresence>
      {/* Back Navigation */}
      <motion.button
        className="sp-back-btn"
        onClick={() => navigate('/students')}
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.96 }}
      >
        ← Back to Students
      </motion.button>

      {/* ═══════ SECTION 1: Vital Signs Header ═══════ */}
      <section className="sp-vital-signs">
        <div className="sp-vital-left">
          <div
            className="sp-avatar-large"
            style={{ background: student.avatarColor || '#7dd3fc' }}
          >
            {getInitials(student.studentName)}
          </div>
          <div className="sp-vital-info">
            <h1 className="sp-student-name">{student.studentName}</h1>
            <div className="sp-vital-meta">
              <span className="sp-meta-pill">{student.tests?.length || 0} tests recorded</span>
              <span className="sp-meta-pill">Joined {formatDate(student.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="sp-vital-right">
          {/* Score Ring */}
          <div className="sp-score-ring-wrap">
            <svg className="sp-score-ring" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke={getScoreColor(averageScore)}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
              />
            </svg>
            <div className="sp-score-ring-value">
              <span className="sp-score-number" style={{ color: getScoreColor(averageScore) }}>
                {averageScore}
              </span>
              <span className="sp-score-suffix">avg</span>
            </div>
          </div>

          {/* Trend Indicator */}
          {trendData && (
            <div className={`sp-trend sp-trend-${trendData.direction}`}>
              <span className="sp-trend-arrow">
                {trendData.direction === 'up' ? '↑' : trendData.direction === 'down' ? '↓' : '→'}
              </span>
              <span className="sp-trend-label">{trendData.label}</span>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ SECTION 2: Action Buttons ═══════ */}
      <section className="sp-action-section">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadTest}
          style={{ display: 'none' }}
          id="sp-test-upload"
        />
        <div className="sp-action-row">
          <motion.button
            className="sp-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            whileHover={{ scale: uploading ? 1 : 1.02, y: uploading ? 0 : -2 }}
            whileTap={{ scale: uploading ? 1 : 0.98 }}
          >
            {uploading ? (
              <>
                <span className="sp-upload-spinner" />
                <span>AI is grading… please wait</span>
              </>
            ) : (
              <>
                <span className="sp-upload-icon">📄</span>
                <span>Upload New Test</span>
              </>
            )}
          </motion.button>

          <motion.button
            className="sp-notify-parent-btn"
            onClick={() => setShowParentModal(true)}
            disabled={!student.tests?.length}
            title={student.tests?.length ? 'Generate a bilingual parent update' : 'Upload at least one test first'}
            whileHover={{ scale: student.tests?.length ? 1.02 : 1, y: student.tests?.length ? -2 : 0 }}
            whileTap={{ scale: student.tests?.length ? 0.98 : 1 }}
          >
            <span className="sp-upload-icon">💬</span>
            <span>Notify Parent</span>
          </motion.button>
        </div>
      </section>

      {/* ═══════ SECTION 3: Error DNA Profile ═══════ */}
      {(errorDNA.length > 0 || struggleCloud.length > 0) && (
        <section className="sp-struggle-section">
          <div className="sp-section-header">
            <span className="sp-section-eyebrow">Cumulative Profile</span>
            <h2 className="sp-section-title">Error DNA Profile</h2>
            <p className="sp-section-desc">
              Tracks specific misconceptions and their persistence across all submissions.
            </p>
          </div>

          <ErrorDNA errorDNA={errorDNA} />

          {struggleCloud.length > 0 && (
            <div className="sp-practice-tests-section" style={{ marginTop: '2rem' }}>
              <h3 className="sp-practice-tests-title">🎯 Targeted Practice Tests</h3>
              <div className="sp-practice-tests-grid">
                {struggleCloud.slice(0, 3).map((item, i) => {
                  const formattedTopic = item.concept.toLowerCase().replace(/\s+/g, '_');
                  const pdfUrl = `/practice_tests_pdf/${formattedTopic}_practice_test.pdf`;
                  return (
                    <div key={item.concept} className="sp-practice-card">
                      <div className="sp-practice-card-left">
                        <span className="sp-practice-rank">#{i + 1}</span>
                        <div>
                          <div className="sp-practice-concept">{item.concept}</div>
                          <div className="sp-practice-desc">Based on {item.count} recurring {item.count === 1 ? 'mistake' : 'mistakes'}</div>
                        </div>
                      </div>
                      <button 
                        className="sp-practice-btn"
                        onClick={() => window.open(pdfUrl, '_blank')}
                      >
                        <span className="sp-practice-btn-icon">📥</span>
                        <span>Download Test</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══════ SECTION 4: Test Timeline ═══════ */}
      <section className="sp-timeline-section">
        <div className="sp-section-header">
          <span className="sp-section-eyebrow">Test History</span>
          <h2 className="sp-section-title">Test Timeline</h2>
          <p className="sp-section-desc">
            Chronological record of every test and the specific concepts missed.
          </p>
        </div>

        {sortedTests.length === 0 ? (
          <div className="sp-timeline-empty">
            <span className="sp-timeline-empty-icon">📋</span>
            <p>No tests recorded yet. Upload the first test above to start tracking.</p>
          </div>
        ) : (
          <div className="sp-timeline-grid">
            <AnimatePresence>
              {sortedTests.map((test, i) => {
                const testKey = test._id || test.testId || i;
                const isExpanded = expandedTests[testKey];

                return (
                  <motion.div
                    key={testKey}
                    className="sp-test-card"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="sp-test-card-main">
                      <div className="sp-test-card-left">
                        <div
                          className="sp-test-score-dot"
                          style={{ background: getScoreColor(test.score) }}
                        />
                        <div className="sp-test-info">
                          <span className="sp-test-date">{formatDate(test.date)}</span>
                          <span className="sp-test-score-text">
                            Score: <strong style={{ color: getScoreColor(test.score) }}>{test.score}</strong>
                            <span className="sp-test-out-of">/{test.totalQuestions * 10 || 100}</span>
                          </span>
                        </div>
                      </div>

                      <div className="sp-test-card-right">
                        <button
                          className="sp-test-expand-btn replay-btn"
                          style={{ marginRight: '8px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                          onClick={() => setReplayTestId(testKey)}
                        >
                          ▶ AI Replay
                        </button>
                        {test.mistakes.length > 0 ? (
                          <button
                            className={`sp-test-expand-btn ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleTestExpand(testKey)}
                          >
                            {isExpanded ? 'Hide Mistakes' : 'View Mistakes'}
                            <span className="sp-test-expand-chevron">{isExpanded ? '▲' : '▼'}</span>
                          </button>
                        ) : (
                          <span className="sp-test-perfect">✨ Perfect Score</span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Mistakes Section */}
                    <AnimatePresence>
                      {isExpanded && test.mistakes.length > 0 && (
                        <motion.div
                          className="sp-test-mistakes"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <ul className="sp-mistakes-list">
                            {test.mistakes.map((m, mi) => (
                              <li key={mi} className="sp-mistake-item">
                                <span className="sp-mistake-q">{m.questionNumber}</span>
                                <span className="sp-mistake-concept">{m.conceptMissed}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentProfile;
