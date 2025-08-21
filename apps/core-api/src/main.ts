import express from 'express';

const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('AI Wizard Core API is running!');
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});