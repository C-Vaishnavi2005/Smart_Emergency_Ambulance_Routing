const express = require('express');
const cors = require('cors');

const hospitalsRouter = require('./routes/hospitals');
const routingRouter = require('./routes/routing');
const trafficRouter = require('./routes/traffic');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/routing', routingRouter);
app.use('/api/traffic', trafficRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚑 MEDRoute Server running on port ${PORT}`);
  });
}

module.exports = app;
