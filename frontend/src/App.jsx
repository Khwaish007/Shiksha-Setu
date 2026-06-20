import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './index.css';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import StudentDashboard from './components/StudentDashboard';
import StudentProfile from './components/StudentProfile';
import SessionHistoryModal from './components/SessionHistoryModal';
import { analyticsAPI } from './api/analyticsAPI';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const bootstrappedRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshSessions = async () => {
    const nextSessions = await analyticsAPI.listGradingSessions();
    setSessions(nextSessions);
    return nextSessions;
  };

  const refreshActiveSession = async (sessionId = activeSession?.sessionId) => {
    if (!sessionId) return null;
    const refreshed = await analyticsAPI.getGradingSession(sessionId);
    setActiveSession(refreshed);
    await refreshSessions();
    return refreshed;
  };

  const createFreshSession = async () => {
    setSessionLoading(true);
    try {
      const session = await analyticsAPI.createGradingSession();
      setActiveSession(session);
      await refreshSessions();
      setRefreshTrigger(prev => prev + 1);
      return session;
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const bootstrapSession = async () => {
      setSessionLoading(true);
      try {
        const session = await analyticsAPI.createGradingSession();
        setActiveSession(session);
        await refreshSessions();
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Failed to create grading session:', error);
      } finally {
        setSessionLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  const handleGradingComplete = async () => {
    await refreshActiveSession();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleResumeSession = async (sessionId) => {
    setSessionLoading(true);
    try {
      const session = await analyticsAPI.resumeGradingSession(sessionId);
      setActiveSession(session);
      await refreshSessions();
      setRefreshTrigger(prev => prev + 1);
      setShowSessionHistory(false);
      navigate('/');
      setActiveView('dashboard');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleNewSession = async () => {
    await createFreshSession();
    setShowSessionHistory(false);
    navigate('/');
    setActiveView('upload');
  };

  const handleDeleteSession = async (sessionId) => {
    await analyticsAPI.deleteGradingSession(sessionId);
    const nextSessions = await refreshSessions();

    if (activeSession?.sessionId === sessionId) {
      const fallback = nextSessions.find(item => item.sessionId !== sessionId);
      if (fallback) {
        await handleResumeSession(fallback.sessionId);
      } else {
        await createFreshSession();
      }
    }
  };

  const isStudentsRoute = location.pathname.startsWith('/students');
  const isHomeRoute = location.pathname === '/';

  return (
    <div className="app-container">
      <div className="app-background" aria-hidden="true">
        <div className="bg-orb orb-one" />
        <div className="bg-orb orb-two" />
        <div className="bg-grid" />
      </div>

      <header className="app-topbar">
        <div>
          <span className="app-kicker">Shiksha Intelligence Suite</span>
          <h1>Premium classroom analytics and batch grading</h1>
        </div>
        <div className="topbar-actions">
          <span className="session-chip" title={activeSession?.sessionId || 'Preparing session'}>
            {sessionLoading ? 'Preparing session' : activeSession?.title || 'Fresh session'}
          </span>
          <button
            className="topbar-chip"
            onClick={() => setShowSessionHistory(true)}
          >
            History
          </button>
          <button
            className={`topbar-chip ${isHomeRoute && activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { navigate('/'); setActiveView('dashboard'); }}
          >
            Dashboard
          </button>
          <button
            className={`topbar-chip ${isHomeRoute && activeView === 'upload' ? 'active' : ''}`}
            onClick={() => { navigate('/'); setActiveView('upload'); }}
          >
            Upload Tests
          </button>
          <button
            className={`topbar-chip ${isStudentsRoute ? 'active' : ''}`}
            onClick={() => navigate('/students')}
          >
            Students
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/" element={
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div
                key={`dashboard-${refreshTrigger}`}
                className="view-stage"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <Dashboard session={activeSession} />
              </motion.div>
            )}

            {activeView === 'upload' && (
              <motion.div
                key="upload"
                className="upload-view"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <UploadSection
                  sessionId={activeSession?.sessionId}
                  onGradingExecutionComplete={async () => {
                    await handleGradingComplete();
                    setActiveView('dashboard');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        } />

        <Route path="/students" element={
          <motion.div
            className="view-stage"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <StudentDashboard />
          </motion.div>
        } />

        <Route path="/students/:id" element={
          <motion.div
            className="view-stage"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <StudentProfile
              sessionId={activeSession?.sessionId}
              onSessionUpdated={() => {
                handleGradingComplete();
              }}
            />
          </motion.div>
        } />
      </Routes>

      <AnimatePresence>
        {showSessionHistory && (
          <SessionHistoryModal
            sessions={sessions}
            activeSessionId={activeSession?.sessionId}
            onClose={() => setShowSessionHistory(false)}
            onResume={handleResumeSession}
            onNewSession={handleNewSession}
            onDelete={handleDeleteSession}
          />
        )}
      </AnimatePresence>

      {isHomeRoute && (
        <motion.button
          className="fab-button"
          onClick={() => setActiveView(activeView === 'dashboard' ? 'upload' : 'dashboard')}
          title={activeView === 'dashboard' ? 'Upload New Worksheets' : 'View Analytics'}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="fab-icon">{activeView === 'dashboard' ? '+' : 'A'}</span>
          <span className="fab-copy">{activeView === 'dashboard' ? 'Upload' : 'Analytics'}</span>
        </motion.button>
      )}
    </div>
  );
}

export default App;
