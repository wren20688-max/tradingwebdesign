// ============================================================================
// STORAGE MODULE - Session & User Data Management
// ============================================================================

const storage = {
  // User session management
  getUser: function() {
    const user = localStorage.getItem('preo_user');
    return user ? JSON.parse(user) : null;
  },

  setUser: function(user) {
    localStorage.setItem('preo_user', JSON.stringify(user));
  },

  removeUser: function() {
    localStorage.removeItem('preo_user');
    localStorage.removeItem('preo_token');
  },

  isLoggedIn: function() {
    return this.getUser() !== null;
  },

  // Token management
  getToken: function() {
    return localStorage.getItem('preo_token');
  },

  setToken: function(token) {
    localStorage.setItem('preo_token', token);
  },

  // Balance management
  getBalance: function(account = 'demo') {
    const key = `balance_${account}`;
    return parseFloat(localStorage.getItem(key) || '10000');
  },

  setBalance: function(amount, account = 'demo') {
    const key = `balance_${account}`;
    localStorage.setItem(key, amount.toString());
  },

  // Trade history
  getTrades: function() {
    const trades = localStorage.getItem('preo_trades');
    return trades ? JSON.parse(trades) : [];
  },

  addTrade: function(trade) {
    const trades = this.getTrades();
    trades.unshift(trade);
    localStorage.setItem('preo_trades', JSON.stringify(trades.slice(0, 100))); // Keep last 100
  },

  // Positions
  getPositions: function() {
    const positions = localStorage.getItem('preo_positions');
    return positions ? JSON.parse(positions) : [];
  },

  setPositions: function(positions) {
    localStorage.setItem('preo_positions', JSON.stringify(positions));
  },

  // Transactions
  getTransactions: function() {
    const transactions = localStorage.getItem('preo_transactions');
    return transactions ? JSON.parse(transactions) : [];
  },

  addTransaction: function(transaction) {
    const transactions = this.getTransactions();
    transactions.unshift(transaction);
    localStorage.setItem('preo_transactions', JSON.stringify(transactions.slice(0, 200)));
  },

  // Clear all data (logout)
  clearAll: function() {
    const keys = ['preo_user', 'preo_token', 'preo_trades', 'preo_positions', 'preo_transactions'];
    keys.forEach(key => localStorage.removeItem(key));
  }
};
