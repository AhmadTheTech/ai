const fs = require('fs');
const { NlpManager } = require('node-nlp');
const manager = new NlpManager({ languages: ['en'] });

// Read and split framer_components.txt
const framerData = fs.readFileSync('framer_components.txt', 'utf8').split('\n\n');

// Simple: Take the first 10 sections for demo (increase as needed)
framerData.slice(0, 10).forEach((chunk, i) => {
  manager.addDocument('en', `Framer info section ${i}`, `framer.section${i}`);
  manager.addAnswer('en', `framer.section${i}`, chunk);
});

// If you have react_guide.txt (PDF converted to text), repeat for that file:
if (fs.existsSync('./react_guide.txt')) {
  const reactData = fs.readFileSync('react_guide.txt', 'utf8').split('\n\n');
  reactData.slice(0, 10).forEach((chunk, i) => {
    manager.addDocument('en', `React info section ${i}`, `react.section${i}`);
    manager.addAnswer('en', `react.section${i}`, chunk);
  });
}

// Train and start server as before
(async () => {
  await manager.train();
  manager.save();
})();

const express = require('express');
const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { message } = req.body;
  const response = await manager.process('en', message);
  res.json({ reply: response.answer || "Sorry, I don't know that yet." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
