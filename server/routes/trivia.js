const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const QUESTIONS_FILE = path.join(__dirname, '../data/trivia_questions.json');

function getQuestions() {
  if (!fs.existsSync(QUESTIONS_FILE)) return [];
  return JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
}

function saveQuestions(questions) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
}

// GET /api/trivia/questions
router.get('/questions', (req, res) => {
  try {
    const data = getQuestions();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read questions' });
  }
});

// POST /api/trivia/questions
router.post('/questions', (req, res) => {
  try {
    const questions = getQuestions();
    const newQuestion = req.body;
    
    // Assign a new ID based on the max ID
    const maxId = questions.reduce((max, q) => (q.id > max ? q.id : max), 0);
    newQuestion.id = maxId + 1;
    
    questions.push(newQuestion);
    saveQuestions(questions);
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save question' });
  }
});

// PUT /api/trivia/questions/:id
router.put('/questions/:id', (req, res) => {
  try {
    const questions = getQuestions();
    const id = parseInt(req.params.id, 10);
    const index = questions.findIndex(q => q.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    questions[index] = { ...questions[index], ...req.body, id };
    saveQuestions(questions);
    res.json(questions[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/trivia/questions/:id
router.delete('/questions/:id', (req, res) => {
  try {
    let questions = getQuestions();
    const id = parseInt(req.params.id, 10);
    questions = questions.filter(q => q.id !== id);
    saveQuestions(questions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// POST /api/trivia/questions/shuffle
router.post('/questions/shuffle', (req, res) => {
  try {
    const questions = getQuestions();
    // Fisher-Yates array shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    saveQuestions(questions);
    res.json({ success: true, count: questions.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to shuffle questions' });
  }
});

module.exports = router;
