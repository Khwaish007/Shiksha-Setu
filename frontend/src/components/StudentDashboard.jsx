import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsAPI } from '../api/analyticsAPI';
import CreateStudentModal from './CreateStudentModal';
import '../styles/StudentDashboard.css';

const StudentDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    try {
      const data = await analyticsAPI.getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleStudentCreated = (newStudent) => {
    setStudents(prev => [newStudent, ...prev]);
    setShowCreateModal(false);
  };

  const filteredStudents = students.filter(s =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name) => {
    const parts = name.split(/[\s_]+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getScoreClass = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-average';
    return 'score-critical';
  };

  if (loading) {
    return (
      <div className="sd-loading">
        <div className="sd-loading-spinner" />
        <p>Loading student profiles...</p>
      </div>
    );
  }

  return (
    <div className="sd-container">
      <header className="sd-header">
        <div className="sd-header-text">
          <span className="sd-eyebrow">Individual Tracking</span>
          <h1 className="sd-title">
            <span className="sd-gradient-text">Student Profiles</span>
          </h1>
          <p className="sd-subtitle">Track individual progress, identify patterns, and personalize interventions.</p>
        </div>
        <motion.button
          className="sd-create-btn"
          onClick={() => setShowCreateModal(true)}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="sd-create-icon">+</span>
          <span>Add New Student</span>
        </motion.button>
      </header>

      {/* Search Bar */}
      <div className="sd-search-bar">
        <div className="sd-search-input-wrap">
          <span className="sd-search-icon">🔍</span>
          <input
            type="text"
            className="sd-search-input"
            placeholder="Search students by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="sd-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
        <div className="sd-stats-pill">
          <span className="sd-stats-count">{students.length}</span>
          <span className="sd-stats-label">Students</span>
        </div>
      </div>

      {/* Student Cards Grid */}
      {filteredStudents.length === 0 ? (
        <motion.div
          className="sd-empty-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="sd-empty-icon">👤</div>
          <h3>{searchQuery ? 'No students match your search' : 'No students yet'}</h3>
          <p>{searchQuery ? 'Try a different search term.' : 'Create your first student profile to start tracking individual progress.'}</p>
          {!searchQuery && (
            <motion.button
              className="sd-empty-btn"
              onClick={() => setShowCreateModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              + Create First Student
            </motion.button>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="sd-grid"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } }
          }}
        >
          {filteredStudents.map((student) => (
            <motion.div
              key={student._id}
              className="sd-card"
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              onClick={() => navigate(`/students/${student._id}`)}
            >
              <div className="sd-card-header">
                <div
                  className="sd-avatar"
                  style={{ background: student.avatarColor || '#7dd3fc' }}
                >
                  {getInitials(student.studentName)}
                </div>
                <div className="sd-card-info">
                  <h3 className="sd-card-name">{student.studentName}</h3>
                  <span className="sd-card-tests">
                    {student.totalTests} {student.totalTests === 1 ? 'test' : 'tests'} recorded
                  </span>
                </div>
              </div>

              <div className="sd-card-score-row">
                <div className={`sd-score-badge ${getScoreClass(student.averageScore)}`}>
                  <span className="sd-score-value">{student.averageScore}</span>
                  <span className="sd-score-label">avg</span>
                </div>
                <div className="sd-card-arrow">→</div>
              </div>

              <div className="sd-card-shimmer" />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Student Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateStudentModal
            onClose={() => setShowCreateModal(false)}
            onStudentCreated={handleStudentCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboard;
