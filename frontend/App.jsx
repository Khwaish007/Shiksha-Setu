import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [recentGrades, setRecentGrades] = useState([]);

  // Fetch Heatmap data on load
  const fetchHeatmap = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/heatmap');
      setHeatmapData(res.data);
    } catch (err) {
      console.error("Error fetching heatmap:", err);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  // Handle batch upload to backend
  const handleUpload = async () => {
    if (files.length === 0) return alert("Select files first!");
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('worksheets', files[i]);
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/grade', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRecentGrades(res.data);
      fetchHeatmap(); // Refresh heatmap after new grades
      alert("Grading Complete!");
    } catch (err) {
      console.error(err);
      alert("Error processing files.");
    } finally {
      setLoading(false);
    }
  };

  // UI Styles
  const styles = {
    container: { fontFamily: 'Arial, sans-serif', padding: '40px', maxWidth: '1000px', margin: 'auto' },
    card: { border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '30px' },
    button: { background: '#007bff', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    th: { borderBottom: '2px solid #ddd', padding: '10px', textAlign: 'left' },
    td: { borderBottom: '1px solid #ddd', padding: '10px' }
  };

  return (
    <div style={styles.container}>
      <h1>SahAI Formative Assessor</h1>
      
      {/* SECTION: UPLOAD & GRADE */}
      <div style={styles.card}>
        <h2>1. Batch Upload Worksheets</h2>
        <input type="file" multiple accept="image/*" onChange={handleFileChange} />
        <br /><br />
        <button style={styles.button} onClick={handleUpload} disabled={loading}>
          {loading ? "AI is Grading... Please wait" : `Grade ${files.length} Worksheets`}
        </button>
      </div>

      {/* SECTION: CLASSROOM HEATMAP */}
      <div style={styles.card}>
        <h2>2. Classroom Heatmap (Concepts to Re-teach)</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Concept Missed</th>
              <th style={styles.th}>Number of Students Struggling</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((item, index) => {
              // Calculate a red background intensity based on count
              const intensity = Math.min(item.count * 0.2, 0.8); 
              return (
                <tr key={index} style={{ backgroundColor: `rgba(255, 0, 0, ${intensity})` }}>
                  <td style={styles.td}><strong>{item._id}</strong></td>
                  <td style={styles.td}>{item.count}</td>
                  <td style={styles.td}>{item.count > 3 ? "⚠️ Review Tomorrow" : "Pass"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SECTION: RECENT GRADES LOG */}
      {recentGrades.length > 0 && (
        <div style={styles.card}>
          <h2>Recent Grading Log</h2>
          <ul>
            {recentGrades.map((grade, index) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                <strong>{grade.studentName || 'Student'}</strong>: Score {grade.totalScore} 
                {grade.status === "Manual Review Required" && <span style={{color: 'red'}}> (Needs Review)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;