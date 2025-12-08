// Simple storage system for user data and token
const storage = {
  setUser: u => localStorage.setItem('preo_user', JSON.stringify(u)),
  getUser: () => JSON.parse(localStorage.getItem('preo_user') || "null"),
  clearUser: () => { localStorage.removeItem('preo_user'); localStorage.removeItem('preo_token'); },
  setToken: t => localStorage.setItem('preo_token', t),
  getToken: () => localStorage.getItem('preo_token')
};

// Global loading indicator
let isLoading = false;
function showLoading(show = true) {
  isLoading = show;
  let loader = document.getElementById('globalLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.3); display:none; z-index:9999;
      align-items:center; justify-content:center;
    `;
    loader.innerHTML = '<div style="background:white; padding:20px; border-radius:8px; text-align:center;"><p>Loading...</p></div>';
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

// API helper with 401 handling and loading indicator
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3000' : `${window.location.protocol}//${window.location.hostname}:3000`;
async function apiRequest(path, opts = {}){
  const headers = opts.headers || {};
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  const token = storage.getToken();
  if(token) headers['Authorization'] = 'Bearer ' + token;
  
  showLoading(true);
  try {
    const res = await fetch(API_BASE + path, { ...opts, headers });
    const data = await res.json().catch(()=>null);
    
    // Handle 401 Unauthorized - redirect to login
    if(res.status === 401) {
      storage.clearUser();
      window.location.href = 'login.html';
      throw new Error('Session expired. Please login again.');
    }
    
    if(!res.ok) throw new Error((data && data.error) ? data.error : `Request failed: ${res.status}`);
    return data;
  } finally {
    showLoading(false);
  }
}

// ================== Login Page ==================
const loginForm = document.getElementById('loginForm');
const demoBtn = document.getElementById('demoBtn');

if(loginForm){
  loginForm.addEventListener('submit', e=>{
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if(!email || !password){
      alert('Please fill in all fields');
      return;
    }
    // Simulate login: any email/password accepted
    storage.setUser({ email, username: email.split('@')[0], balance: 10000, category: 'demo' });
    window.location.href = 'dashboard.html';
  });
}

if(demoBtn){
  demoBtn.addEventListener('click', ()=>{
    storage.setUser({email:'demo@preofx.local', username:'demo_user', balance:10000, category: 'demo'});
    window.location.href = 'dashboard.html';
  });
}

// ================== Dashboard Page ==================
// Check if user is logged in and fetch account balance from API
const balanceEl = document.getElementById('balance');
function refreshBalance(){
  if(!balanceEl) return;
  const user = storage.getUser();
  if(!user) { window.location.href = 'login.html'; return; }
  balanceEl.textContent = '$' + Number(user.balance || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
refreshBalance();

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn){
  logoutBtn.addEventListener('click', ()=>{
    storage.clearUser();
    window.location.href = 'index.html';
  });
}

// Dark/Light mode toggle
const toggleBtn = document.getElementById('toggleMode');
if(toggleBtn){
  toggleBtn.addEventListener('click', ()=>{
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
  });
}

// Load dark mode preference
if(localStorage.getItem('darkMode') === 'true'){
  document.body.classList.add('dark-mode');
}

// ================== Trading Functions ==================
async function addTrade(type){
  const asset = document.getElementById('assetSelect')?.value;
  const size = parseFloat(document.getElementById('size')?.value);
  if(!asset || !size || size <= 0){
    alert('Invalid trade parameters');
    return;
  }
  // Simulate P/L
  const pnl = ((Math.random()-0.5) * 20 * size).toFixed(2);
  // Record trade
  const trades = JSON.parse(localStorage.getItem('trades') || "[]");
  trades.unshift({
    type, 
    asset, 
    size, 
    pnl, 
    date: new Date().toLocaleString()
  });
  localStorage.setItem('trades', JSON.stringify(trades));
  // Update balance
  const user = storage.getUser();
  if(user){
    user.balance += parseFloat(pnl);
    storage.setUser(user);
    if(balanceEl) balanceEl.textContent = '$' + user.balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  // Clear form
  document.getElementById('size').value = '';
  renderTrades();
}

async function renderTrades(){
  const tradesEl = document.getElementById('openTrades');
  if(!tradesEl) return;
  const trades = JSON.parse(localStorage.getItem('trades') || "[]");
  tradesEl.innerHTML = '';
  if(trades.length === 0){
    tradesEl.textContent = 'No trades yet.';
    return;
  }
  trades.forEach(t=>{
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px; border:1px solid #ddd; margin:4px 0; border-radius:4px;';
    div.textContent = `[${t.date}] ${t.type.toUpperCase()} ${t.asset} | Size:${t.size} | P/L:$${parseFloat(t.pnl).toFixed(2)}`;
    tradesEl.appendChild(div);
  });
}

// Buy/Sell buttons
const buyBtn = document.getElementById('buyBtn');
const sellBtn = document.getElementById('sellBtn');

if(buyBtn) buyBtn.addEventListener('click', async ()=> await addTrade('buy'));
if(sellBtn) sellBtn.addEventListener('click', async ()=> await addTrade('sell'));

if(document.getElementById('openTrades')) renderTrades();

// ================== Deposit & Withdraw ==================
async function recordTransaction(type, amount){
  const transactions = JSON.parse(localStorage.getItem('transactions') || "[]");
  transactions.unshift({
    type, 
    amount, 
    date: new Date().toLocaleString()
  });
  localStorage.setItem('transactions', JSON.stringify(transactions));
  renderTransactions();
}

async function renderTransactions(){
  const container = document.getElementById('transactionsList');
  if(!container) return;
  const transactions = JSON.parse(localStorage.getItem('transactions') || "[]");
  container.innerHTML = '';
  if(transactions.length === 0){
    container.textContent = 'No transactions yet.';
    return;
  }
  transactions.forEach(t=>{
    const div = document.createElement('div');
    div.style.cssText = 'padding:6px; border:1px solid #ddd; margin:4px 0; border-radius:4px;';
    div.textContent = `[${t.date}] ${t.type}: $${parseFloat(t.amount).toFixed(2)}`;
    container.appendChild(div);
  });
}

if(document.getElementById('transactionsList')) renderTransactions();

const depositBtn = document.getElementById('depositBtn');
const withdrawBtn = document.getElementById('withdrawBtn');

if(depositBtn){
  depositBtn.addEventListener('click', ()=>{
    const amount = parseFloat(document.getElementById('depositAmount').value);
    if(!isNaN(amount) && amount > 0){
      const user = storage.getUser();
      if(user){
        user.balance += amount;
        storage.setUser(user);
        if(balanceEl) balanceEl.textContent = '$' + user.balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
        recordTransaction('Deposit', amount);
        document.getElementById('depositAmount').value = '';
      }
    } else {
      alert('Please enter a valid amount');
    }
  });
}

if(withdrawBtn){
  withdrawBtn.addEventListener('click', ()=>{
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const user = storage.getUser();
    if(!isNaN(amount) && amount > 0 && amount <= user.balance){
      user.balance -= amount;
      storage.setUser(user);
      if(balanceEl) balanceEl.textContent = '$' + user.balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
      recordTransaction('Withdraw', amount);
      document.getElementById('withdrawAmount').value = '';
    } else {
      alert('Insufficient balance or invalid amount');
    }
  });
}

// ================== Populate Asset Dropdowns ==================
function populateAssets(){
  if(typeof assets === 'undefined') return;
  
  const assetSelect = document.getElementById('assetSelect');
  const botAsset = document.getElementById('botAsset');
  
  if(assetSelect){
    assets.forEach(a=>{
      if(!Array.from(assetSelect.options).find(opt => opt.value === a.symbol)){
        const option = document.createElement('option');
        option.value = a.symbol;
        option.textContent = a.symbol;
        assetSelect.appendChild(option);
      }
    });
  }
  
  if(botAsset){
    assets.forEach(a=>{
      if(!Array.from(botAsset.options).find(opt => opt.value === a.symbol)){
        const option = document.createElement('option');
        option.value = a.symbol;
        option.textContent = a.symbol;
        botAsset.appendChild(option);
      }
    });
  }
}

// Wait for assets to load, then populate
if(typeof assets !== 'undefined'){
  populateAssets();
} else {
  setTimeout(populateAssets, 500);
}

// ================== Bot Management ==================
const addBotBtn = document.getElementById('addBotBtn');
if(addBotBtn){
  addBotBtn.addEventListener('click', ()=>{
    const name = document.getElementById('botName').value.trim();
    const asset = document.getElementById('botAsset').value;
    const type = document.getElementById('botType').value;
    const size = parseFloat(document.getElementById('botSize').value);
    const interval = parseInt(document.getElementById('botInterval').value);
    
    if(!name || !asset || size <= 0 || interval <= 0){
      alert('Please fill in all bot fields correctly');
      return;
    }
    
    if(typeof createBot === 'function'){
      createBot(name, asset, type, size, interval);
      renderActiveBots();
      document.getElementById('botName').value = '';
    }
  });
}

function renderActiveBots(){
  if(typeof bots === 'undefined') return;
  
  const container = document.getElementById('activeBots');
  if(!container) return;
  
  container.innerHTML = '';
  bots.forEach((b, idx)=>{
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px; border:1px solid #ddd; margin:4px 0; border-radius:4px; display:flex; justify-content:space-between; align-items:center;';
    div.innerHTML = `
      <span>${b.name} | ${b.asset} | ${b.type.toUpperCase()} | Size:${b.size} | Every ${b.interval}s</span>
      <button class="btn outline" style="padding:4px 8px; margin-left:10px;" onclick="removeBot(${idx})">Remove</button>
    `;
    container.appendChild(div);
  });
}

// Set up initial render
setTimeout(renderActiveBots, 1000);

// Make removeBot available globally
function removeBot(idx){
  if(typeof bots !== 'undefined' && bots[idx]){
    bots.splice(idx, 1);
    if(typeof saveBots === 'function') saveBots();
    renderActiveBots();
  }
}
window.removeBot = removeBot;
