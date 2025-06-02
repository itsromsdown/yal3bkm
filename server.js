// server.js (or index.js in your repo root)
const express = require('express');
const app = express();

// Render will set process.env.PORT=3000 for you.
// Fallback to 3000 locally if PORT isn’t defined.
const port = process.env.PORT || 3000;

app.get('/test', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
