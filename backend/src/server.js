import app from './app.js';

const APPLICATION_PORT = process.env.PORT || 5000;

app.listen(APPLICATION_PORT, () => {
  console.log(`Server executing securely on network port: ${APPLICATION_PORT}`);
});
