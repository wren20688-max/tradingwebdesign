
let bots = JSON.parse(localStorage.getItem('bots') || '[]');

function createBot(name, asset, type, size, intervalSeconds) {
  const bot = {
    id: 'bot_' + Date.now() + '_' + Math.floor(Math.random()*10000),
    name,
    asset,
    type,
    size,
    interval: intervalSeconds,
    status: 'active',
    lastRun: 0
  };
  bots.push(bot);
  saveBots();
  return bot;
}

function fetchBots() {
  bots = JSON.parse(localStorage.getItem('bots') || '[]');
  return bots;
}

function deleteBot(id) {
  bots = bots.filter(b => b.id !== id);
  saveBots();
}

function saveBots() {
  localStorage.setItem('bots', JSON.stringify(bots));
  if (typeof renderActiveBots === 'function') {
    renderActiveBots();
  }
}

// Load bots on script load
fetchBots();


// Bot execution engine (localStorage, instant)
setInterval(() => {
  const now = Date.now();
  bots.forEach(bot => {
    if (bot.status === 'active') {
      if (!bot.lastRun) bot.lastRun = 0;
      if (now - bot.lastRun >= bot.interval * 1000) {
        bot.lastRun = now;
        // Simulate trade: update demo trades and balance
        const trades = JSON.parse(localStorage.getItem('trades_demo') || '[]');
        
        // Realistic P&L based on pips (1 pip = 0.0001 for forex)
        // bot.size is in lots (0.01 = 0.01 lot)
        // 1 pip value = size * 10 USD for standard forex
        const pipValue = bot.size * 10;
        
        // Win 60% of time on average with demo account
        const isWinning = Math.random() < 0.60;
        let pnl;
        
        if (isWinning) {
          // Winning trade: 0-2 pips profit
          const pipsWon = Math.random() * 2;
          pnl = pipsWon * pipValue;
        } else {
          // Losing trade: 0-1 pip loss
          const pipsLost = Math.random() * 1;
          pnl = -(pipsLost * pipValue);
        }
        
        trades.unshift({
          type: bot.type,
          asset: bot.asset,
          size: bot.size,
          pnl: pnl.toFixed(2),
          date: new Date().toLocaleString(),
          bot: bot.name
        });
        localStorage.setItem('trades_demo', JSON.stringify(trades));
        // Update demo balance
        let bal = parseFloat(localStorage.getItem('balance_demo') || '10000');
        bal += pnl;
        localStorage.setItem('balance_demo', bal.toString());
        if (typeof refreshBalance === 'function') refreshBalance();
        if (typeof renderTrades === 'function') renderTrades();
        saveBots();
        console.log(`Bot ${bot.name} executed ${bot.type} on ${bot.asset} size ${bot.size}, P&L: ${pnl.toFixed(2)}`);
      }
    }
  });
}, 1000);


