const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const API_BASE = `${API_BASE_URL}/api/v1/grading`;
export const STUDENTS_BASE = `${API_BASE_URL}/api/students`;

export default API_BASE_URL;
