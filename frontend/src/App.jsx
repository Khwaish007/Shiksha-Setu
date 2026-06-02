import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import './index.css';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import StudentDashboard from './components/StudentDashboard';
import StudentProfile from './components/StudentProfile';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'upload'
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const handleGradingComplete = () => {
    // Trigger dashboard refresh
    setRefreshTrigger(prev => prev + 1);
  };

  // Determine which topbar chip is active based on route + state
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
            👤 Students
          </button>
        </div>
      </header>

      <Routes>
        {/* Home Route — original Dashboard / Upload toggle */}
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
                <Dashboard />
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
                <UploadSection onGradingExecutionComplete={() => {
                  handleGradingComplete();
                  setActiveView('dashboard');
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        } />

        {/* Student Dashboard — grid of all students */}
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

        {/* Individual Student Profile */}
        <Route path="/students/:id" element={
          <motion.div
            className="view-stage"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <StudentProfile />
          </motion.div>
        } />
      </Routes>

      {/* FAB — only visible on home route */}
      {isHomeRoute && (
        <motion.button
          className="fab-button"
          onClick={() => setActiveView(activeView === 'dashboard' ? 'upload' : 'dashboard')}
          title={activeView === 'dashboard' ? 'Upload New Worksheets' : 'View Analytics'}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="fab-icon">{activeView === 'dashboard' ? '📤' : '📊'}</span>
          <span className="fab-copy">{activeView === 'dashboard' ? 'Upload' : 'Analytics'}</span>
        </motion.button>
      )}
    </div>
  );
}

export default App;