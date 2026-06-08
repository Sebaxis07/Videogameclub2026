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

// POST /api/trivia/questions/bulk
router.post('/questions/bulk', (req, res) => {
  try {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Body must be a JSON array of questions' });
    }

    const questions = getQuestions();
    let maxId = questions.reduce((max, q) => (q.id > max ? q.id : max), 0);

    const imported = [];
    for (const item of list) {
      if (!item.pregunta || !item.categoria) continue;

      maxId++;
      const q = {
        id: maxId,
        pregunta: item.pregunta,
        categoria: item.categoria,
        tipo_dificultad: item.tipo_dificultad || 'Casual',
        tipo_pregunta: item.tipo_pregunta || 'alternativas',
        desactivada: item.desactivada === true
      };

      if (q.tipo_pregunta === 'alternativas' || q.tipo_pregunta === 'ordenamiento') {
        q.opciones = Array.isArray(item.opciones) ? item.opciones : ['', '', '', ''];
        if (q.tipo_pregunta === 'alternativas') {
          q.respuesta_correcta = typeof item.respuesta_correcta === 'number' ? item.respuesta_correcta : 0;
        } else {
          q.orden_correcto = Array.isArray(item.orden_correcto) ? item.orden_correcto : [0, 1, 2, 3];
        }
      } else if (q.tipo_pregunta === 'verdadero_falso') {
        q.opciones = ['Verdadero', 'Falso'];
        q.respuesta_correcta = typeof item.respuesta_correcta === 'number' ? item.respuesta_correcta : 0;
      } else if (q.tipo_pregunta === 'texto_libre') {
        q.respuesta_texto = item.respuesta_texto || '';
        q.pistas = item.pistas || '';
      } else if (q.tipo_pregunta === 'rango_numerico') {
        q.rango_min = typeof item.rango_min === 'number' ? item.rango_min : 0;
        q.rango_max = typeof item.rango_max === 'number' ? item.rango_max : 100;
        q.respuesta_numero = typeof item.respuesta_numero === 'number' ? item.respuesta_numero : 50;
      }

      questions.push(q);
      imported.push(q);
    }

    if (imported.length === 0) {
      return res.status(400).json({ error: 'No valid questions found to import' });
    }

    saveQuestions(questions);
    res.status(201).json({ success: true, count: imported.length, questions: imported });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import bulk questions' });
  }
});

module.exports = router;
