const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;
const SECRET = 'demo_secret'; // In production, use an environment variable
const SALT_ROUNDS = 10;

// In-memory "database"
let users = [];
let trades = [];
let tradeIdCounter = 1;
let userIdCounter = 1;

// Initialize currentPrice globally
global.currentPrice = 1.1000;

app.use(cors());
app.use(bodyParser.json());

// Middleware to authenticate JWT
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = { id: userIdCounter++, username, password: hashedPassword, isAdmin: false, balance: 10000 };
    users.push(user);
    res.status(201).json({ message: 'Registered successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// Get balance endpoint
app.get('/api/balance', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ balance: user.balance });
});

// Open trade endpoint
app.post('/api/trade/open', authMiddleware, (req, res) => {
  const { symbol, type, size } = req.body;
  if (!symbol || !['buy', 'sell'].includes(type) || !size || size <= 0) {
    return res.status(400).json({ error: 'Invalid symbol, type (buy/sell), or size (must be positive)' });
  }
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Check if user has sufficient balance (assuming 100,000 multiplier for forex-like trading)
  const requiredBalance = size * global.currentPrice * 100000 * 0.01; // 1% margin requirement
  if (user.balance < requiredBalance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const trade = {
    id: tradeIdCounter++,
    userId: user.id,
    username: user.username,
    symbol,
    type,
    size,
    openPrice: global.currentPrice,
    status: 'open'
  };
  trades.push(trade);
  res.status(201).json({ message: 'Trade opened', tradeId: trade.id });
});

// Close trade endpoint
app.post('/api/trade/close', authMiddleware, (req, res) => {
  const { tradeId } = req.body;
  if (!tradeId) return res.status(400).json({ error: 'Trade ID is required' });

  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const trade = trades.find(t => t.id === tradeId && t.userId === user.id && t.status === 'open');
  if (!trade) return res.status(404).json({ error: 'Trade not found or already closed' });

  const pnl = calculatePnL(trade);
  user.balance += pnl;
  trade.status = 'closed';
  res.json({ message: Trade closed. PnL: $${pnl.toFixed(2)} });
});

// Get user trades endpoint
app.get('/api/trade', authMiddleware, (req, res) => {
  const userTrades = trades.filter(t => t.userId === req.user.id);
  res.json({ trades: userTrades });
});

// Admin: Get all users
app.get('/api/admin/users', authMiddleware, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  res.json({ users: users.map(({ password, ...user }) => user) }); // Exclude passwords
});

// Admin: Get all trades
app.get('/api/admin/trades', authMiddleware, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  res.json({ trades });
});

// Admin: Close trade
app.post('/api/admin/trade/close', authMiddleware, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  const { tradeId } = req.body;
  if (!tradeId) return res.status(400).json({ error: 'Trade ID is required' });

  const trade = trades.find(t => t.id === tradeId && t.status === 'open');
  if (!trade) return res.status(404).json({ error: 'Trade not found or already closed' });

  const user = users.find(u => u.id === trade.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const pnl = calculatePnL(trade);
  user.balance += pnl;
  trade.status = 'closed';
  res.json({ message: Admin closed trade. PnL: $${pnl.toFixed(2)} });
});

// Calculate Profit and Loss (PnL)
function calculatePnL(trade) {
  let diff = global.currentPrice - trade.openPrice;
  if (trade.type === 'sell') diff = -diff;
  return diff * trade.size * 100000;
}

// Start HTTP server
app.listen(PORT, () => {
  console.log(REST API server running on http://localhost:${PORT});
});

// WebSocket server for price updates
const wss = new WebSocket.Server({ port: 6000 });

setInterval(() => {
  const change = (Math.random() - 0.5) * 0.001;
  global.currentPrice = parseFloat((global.currentPrice + change).toFixed(5));
  const message = JSON.stringify({ price: global.currentPrice });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}, 1000);

console.log('WebSocket price server running at ws://localhost:6000');