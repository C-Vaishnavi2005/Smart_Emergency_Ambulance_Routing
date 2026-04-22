const express = require('express');
const router = express.Router();

// Traffic simulation state (per session)
const trafficState = {};
const SSE_CLIENTS = [];

function getTrafficMultiplier(emergencyMode) {
  if (emergencyMode) return 0.25 + Math.random() * 0.15; // 0.25–0.4 (signal override)
  return 0.8 + Math.random() * 2.2; // 0.8–3.0 (normal traffic)
}

function generateTrafficUpdate(emergencyMode = false) {
  return {
    timestamp: Date.now(),
    emergencyMode,
    globalMultiplier: getTrafficMultiplier(emergencyMode),
    hotspots: Array.from({ length: Math.floor(Math.random() * 5) }, (_, i) => ({
      id: `hs_${i}`,
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    })),
  };
}

// SSE endpoint for real-time traffic updates
router.get('/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const emergencyMode = req.query.emergency === 'true';

  const send = () => {
    const data = generateTrafficUpdate(emergencyMode);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send(); // Immediate first update
  const interval = setInterval(send, 30000); // Update every 30 seconds

  req.on('close', () => clearInterval(interval));
});

// GET /api/traffic/snapshot
router.get('/snapshot', (req, res) => {
  const emergencyMode = req.query.emergency === 'true';
  res.json(generateTrafficUpdate(emergencyMode));
});

module.exports = router;
