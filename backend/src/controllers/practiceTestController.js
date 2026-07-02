import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const practiceTestsDirs = [
  path.join(projectRoot, 'practice_tests_pdf'),
  path.join(projectRoot, 'frontend', 'public', 'practice_tests_pdf'),
];

export const getPracticeTest = async (req, res) => {
  const concept = req.params.concept;
  if (!concept) {
    return res.status(400).json({ error: 'Concept parameter is missing.' });
  }

  const sanitizedConcept = concept.replace(/\s/g, '_').toLowerCase();
  const filename = `${sanitizedConcept}_practice_test.pdf`;

  try {
    for (const dir of practiceTestsDirs) {
      const filepath = path.join(dir, filename);
      if (fs.existsSync(filepath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return fs.createReadStream(filepath).pipe(res);
      }
    }

    console.error(`Practice test not found for concept: ${concept}`);
    res.status(404).json({ error: 'Practice test not found for this concept.' });
  } catch (error) {
    console.error(`Failed to read practice test for ${concept}:`, error);
    res.status(500).json({ error: 'Failed to retrieve practice test.' });
  }
};
