
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
        // Simulate P/L
        const pnl = ((Math.random()-0.5) * 20 * bot.size).toFixed(2);
        trades.unshift({
          type: bot.type,
          asset: bot.asset,
          size: bot.size,
          pnl,
          date: new Date().toLocaleString(),
          bot: bot.name
        });
        localStorage.setItem('trades_demo', JSON.stringify(trades));
        // Update demo balance
        let bal = parseFloat(localStorage.getItem('balance_demo') || '10000');
        bal += parseFloat(pnl);
        localStorage.setItem('balance_demo', bal.toString());
        if (typeof refreshBalance === 'function') refreshBalance();
        if (typeof renderTrades === 'function') renderTrades();
        saveBots();
        console.log(`Bot ${bot.name} executed ${bot.type} on ${bot.asset} size ${bot.size}`);
      }
    }
  });
}, 1000);


