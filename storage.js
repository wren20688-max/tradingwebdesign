// ============================================================================
// STORAGE MODULE - Session & User Data Management
// ============================================================================

const storage = {
  // User session management
  getUser: function() {
    // Check preo_user first (current session)
    let user = localStorage.getItem('preo_user');
    if (user) {
      return JSON.parse(user);
    }
    
    // If no current session, try to recover from last login
    const lastLogin = localStorage.getItem('preo_last_login');
    if (lastLogin) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const found = users.find(u => u.email && u.email.toLowerCase() === lastLogin.toLowerCase());
      if (found) {
        // Restore session
        const userData = {
          username: found.username || found.email,
          email: found.email,
          timestamp: new Date().getTime()
        };
        localStorage.setItem('preo_user', JSON.stringify(userData));
        localStorage.setItem('preo_token', 'token_' + Date.now());
        return userData;
      }
    }
    
    return null;
  },

  setUser: function(user) {
    localStorage.setItem('preo_user', JSON.stringify(user));
    localStorage.setItem('preo_last_login', user.email);
  },

  removeUser: function() {
    localStorage.removeItem('preo_user');
    localStorage.removeItem('preo_token');
    localStorage.removeItem('preo_saved_email');
    localStorage.removeItem('preo_remember_me');
    localStorage.removeItem('preo_saved_password');
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
