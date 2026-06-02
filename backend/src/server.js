import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDatabase from './config/db.js';
import gradingRouter from './routes/gradeRoutes.js';
import studentRouter from './routes/studentRoutes.js';

dotenv.config();

const app = express();

// Middleware Layer Configurations
app.use(cors());
app.use(express.json());

// Structural API Routing Definitions
app.use('/api/v1/grading', gradingRouter);
app.use('/api/students', studentRouter);

// Initialize Infrastructure Connections
const startServerPipeline = async () => {
  await connectDatabase();
  const APPLICATION_PORT = process.env.PORT || 5000;
  app.listen(APPLICATION_PORT, () => {
    console.log(`Server executing securely on network port: ${APPLICATION_PORT}`);
  });
};

startServerPipeline();