// ============================================================================
// PreoCrypto - Dashboard Application
// Handles trading functionality, data management, and UI interactions
// ============================================================================

// ============================================================================
// GLOBAL STATE & CONFIG
// ============================================================================

let globalState = {
  currentAccount: 'demo',
  selectedPair: 'EUR/USD',
  tradeType: 'BUY',
  chart: null,
  chartType: 'candlestick',
  currentTimeframe: 1,
  drawingTool: 'select',
  priceData: {},
  positions: [],
  trades: [],
  user: null,
  accountBalances: {
    demo: { balance: 10000, equity: 10000, pnl: 0, positions: 0 },
    real: { balance: 0, equity: 0, pnl: 0, positions: 0 }
  }
};

const MARKET_DATA = {
  forex: [
    { symbol: 'EUR/USD', bid: 1.0945, ask: 1.0946, change: 0.12, pair: 'EURUSD' },
    { symbol: 'GBP/USD', bid: 1.2638, ask: 1.2639, change: -0.15, pair: 'GBPUSD' },
    { symbol: 'USD/JPY', bid: 149.48, ask: 149.49, change: 0.08, pair: 'USDJPY' },
    { symbol: 'AUD/USD', bid: 0.6648, ask: 0.6649, change: 0.22, pair: 'AUDUSD' },
    { symbol: 'USD/CAD', bid: 1.3527, ask: 1.3528, change: 0.05, pair: 'USDCAD' },
    { symbol: 'NZD/USD', bid: 0.6085, ask: 0.6086, change: -0.10, pair: 'NZDUSD' },
    { symbol: 'USD/CHF', bid: 0.8745, ask: 0.8746, change: 0.18, pair: 'USDCHF' },
    { symbol: 'EUR/GBP', bid: 0.8562, ask: 0.8563, change: 0.09, pair: 'EURGBP' },
    { symbol: 'EUR/JPY', bid: 163.24, ask: 163.26, change: 0.22, pair: 'EURJPY' },
    { symbol: 'GBP/JPY', bid: 190.45, ask: 190.48, change: -0.08, pair: 'GBPJPY' },
    { symbol: 'AUD/JPY', bid: 99.28, ask: 99.30, change: 0.15, pair: 'AUDJPY' },
    { symbol: 'USD/SGD', bid: 1.3345, ask: 1.3347, change: 0.05, pair: 'USDSGD' }
  ],
  crypto: [
    { symbol: 'Bitcoin', price: 45230, change24h: 2.34, cap: '884B', pair: 'BTCUSD' },
    { symbol: 'Ethereum', price: 2450, change24h: 1.82, cap: '294B', pair: 'ETHUSD' },
    { symbol: 'XRP', price: 2.85, change24h: 0.45, cap: '155B', pair: 'XRPUSD' },
    { symbol: 'Litecoin', price: 125.45, change24h: -0.32, cap: '19B', pair: 'LTCUSD' },
    { symbol: 'Cardano', price: 1.08, change24h: 1.12, cap: '38B', pair: 'ADAUSD' },
    { symbol: 'Dogecoin', price: 0.38, change24h: 2.15, cap: '55B', pair: 'DOGEUSD' }
  ],
  stocks: [
    { symbol: 'Apple Inc.', price: 235.45, change24h: 1.23, pair: 'AAPL' },
    { symbol: 'Microsoft Corp.', price: 428.72, change24h: 0.95, pair: 'MSFT' },
    { symbol: 'Alphabet Inc.', price: 156.89, change24h: 2.15, pair: 'GOOGL' },
    { symbol: 'Amazon.com Inc.', price: 203.45, change24h: 1.42, pair: 'AMZN' },
    { symbol: 'Tesla Inc.', price: 312.65, change24h: -0.78, pair: 'TSLA' },
    { symbol: 'NVIDIA Corp.', price: 889.23, change24h: 3.45, pair: 'NVDA' },
    { symbol: 'Meta Platforms', price: 542.15, change24h: 2.67, pair: 'META' },
    { symbol: 'JPMorgan Chase', price: 198.34, change24h: 0.52, pair: 'JPM' },
    { symbol: 'Visa Inc.', price: 284.56, change24h: 1.08, pair: 'V' },
    { symbol: 'Johnson & Johnson', price: 156.78, change24h: 0.34, pair: 'JNJ' },
    { symbol: 'Walmart Inc.', price: 89.23, change24h: 0.67, pair: 'WMT' },
    { symbol: 'Disney Inc.', price: 92.45, change24h: -0.45, pair: 'DIS' },
    { symbol: 'Netflix Inc.', price: 234.67, change24h: 1.89, pair: 'NFLX' },
    { symbol: 'IBM Corp.', price: 187.34, change24h: 0.78, pair: 'IBM' },
    { symbol: 'Intel Corp.', price: 45.67, change24h: -1.23, pair: 'INTC' }
  ]
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  let appUser = storage.getUser();
  if (!appUser) {
    window.location.href = 'index.html';
    return;
  }

  globalState.user = appUser;
  
  // Reset to 1-minute timeframe on page load
  globalState.currentTimeframe = 1;
  
  // Setup UI
  document.getElementById('username').textContent = appUser.username;
  
  // Load data
  loadBalanceData();
  renderMarketData();
  
  // Initialize chart first, then setup listeners
  setTimeout(() => {
    initChart();
    // Setup event listeners AFTER chart is initialized
    setupEventListeners();
  }, 500);
  
  // Update prices periodically
  setInterval(updatePrices, 2000);
}

// ============================================================================
// DATA LOADING & BALANCE MANAGEMENT
// ============================================================================

function loadBalanceData() {
  // Check if current user is a marketer
  let currentUser = globalState.user;
  const marketers = JSON.parse(localStorage.getItem('marketers') || '[]');
  const marketer = marketers.find(m => m.email === currentUser.email);
  
  let demoData, realData;
  
  if (marketer && marketer.isMarketer) {
    // Marketer: Load balance from marketer account (live trading only)
    realData = {
      balance: marketer.balance,
      equity: marketer.balance,
      pnl: 0,
      positions: 0
    };
    demoData = { balance: 10000, equity: 10000, pnl: 0, positions: 0 };
    
    // Store marketer data
    localStorage.setItem('accountData_real', JSON.stringify(realData));
    localStorage.setItem('accountData_demo', JSON.stringify(demoData));
  } else {
    // Regular user: Load from localStorage
    demoData = JSON.parse(localStorage.getItem('accountData_demo') || '{"balance":10000,"equity":10000,"pnl":0,"positions":0}');
    realData = JSON.parse(localStorage.getItem('accountData_real') || '{"balance":0,"equity":0,"pnl":0,"positions":0}');
    
    // Ensure real account always starts at 0 if not explicitly set by deposits/trades
    if (!localStorage.getItem('accountData_real')) {
      localStorage.setItem('balance_real', '0');
    }
  }
  
  globalState.accountBalances.demo = demoData;
  globalState.accountBalances.real = realData;
  
  // Display current account data
  updateAccountDisplay();
}

function updateAccountDisplay() {
  const account = globalState.currentAccount;
  const data = globalState.accountBalances[account];
  
  // Update display
  updateBalance(data.balance);
  updatePnL(data.pnl);
  updateEquity(data.equity);
  updateOpenPositionsCount();
  
  // Save preference
  localStorage.setItem('currentAccount', account);
}

function saveAccountData() {
  const account = globalState.currentAccount;
  const data = globalState.accountBalances[account];
  localStorage.setItem(`accountData_${account}`, JSON.stringify(data));
  
  // Also save individual balance values for easy access from other pages
  localStorage.setItem(`accountData_${account}_balance`, data.balance.toString());
  localStorage.setItem(`accountData_${account}_equity`, data.equity.toString());
  localStorage.setItem(`accountData_${account}_pnl`, data.pnl.toString());
  
  // If user is a marketer on real account, also update marketer balance
  if (account === 'real') {
    let accUser = globalState.user;
    const marketers = JSON.parse(localStorage.getItem('marketers') || '[]');
    const marketer = marketers.find(m => m.email === accUser.email);
    
    if (marketer && marketer.isMarketer) {
      marketer.balance = data.balance;
      localStorage.setItem('marketers', JSON.stringify(marketers));
    }
  }
}

function updateBalance(amount) {
  document.getElementById('balance').textContent = '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  globalState.accountBalances[globalState.currentAccount].balance = amount;
  saveAccountData();
}

function updateEquity(amount) {
  document.getElementById('equity').textContent = '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  globalState.accountBalances[globalState.currentAccount].equity = amount;
  saveAccountData();
}

function updatePnL(amount) {
  const pnlElement = document.getElementById('todayPnL');
  pnlElement.textContent = (amount >= 0 ? '+' : '') + '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  pnlElement.style.color = amount >= 0 ? 'var(--success)' : 'var(--danger)';
  globalState.accountBalances[globalState.currentAccount].pnl = amount;
  saveAccountData();
}

// ============================================================================
// MARKET DATA & RENDERING
// ============================================================================

function renderMarketData() {
  renderForexPairs();
  renderCryptoPairs();
}

function renderForexPairs() {
  const container = document.getElementById('forexList');
  container.innerHTML = '';
  
  MARKET_DATA.forex.forEach(item => {
    const row = createTableRow({
      pair: item.symbol,
      price: item.ask.toFixed(4),
      change: item.change,
      bidAsk: `${item.bid.toFixed(4)}/${item.ask.toFixed(4)}`,
      symbol: item.symbol,
      pairCode: item.pair
    });
    container.appendChild(row);
  });
}

function renderCryptoPairs() {
  const container = document.getElementById('cryptoList');
  container.innerHTML = '';
  
  MARKET_DATA.crypto.forEach(item => {
    const row = createTableRow({
      pair: item.symbol,
      price: '$' + item.price.toLocaleString(),
      change: item.change24h,
      bidAsk: item.cap,
      symbol: item.symbol,
      pairCode: item.pair
    });
    container.appendChild(row);
  });
}

function createTableRow(data) {
  const row = document.createElement('div');
  row.className = 'table-row';
  const changeClass = data.change >= 0 ? 'positive' : 'negative';
  
  row.innerHTML = `
    <div class="col-pair">${data.pair}</div>
    <div class="col-price">${data.price}</div>
    <div class="col-change ${changeClass}">${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%</div>
    <div class="col-bid-ask">${data.bidAsk}</div>
    <div class="col-action">
      <button class="btn btn-primary btn-small" onclick="openTradeModal('${data.pairCode}', '${data.symbol}')">Trade</button>
    </div>
  `;
  
  return row;
}

// ============================================================================
// PRICE UPDATES & CHART UPDATES
// ============================================================================

let chartUpdateCounter = 0;
let lastCandleTime = Math.floor(Date.now() / 1000);
let currentCandleData = null;

function updatePrices() {
  // Simulate realistic price movements
  MARKET_DATA.forex.forEach(item => {
    const changeAmount = (Math.random() - 0.5) * 0.0001;
    item.bid += changeAmount;
    item.ask += changeAmount;
    item.change += (Math.random() - 0.5) * 0.1;
  });
  
  MARKET_DATA.crypto.forEach(item => {
    const changeAmount = (Math.random() - 0.5) * 50;
    item.price += changeAmount;
    item.change24h += (Math.random() - 0.5) * 0.2;
  });
  
  // Update market ticker display
  updateTicker();
  
  // Update chart with new candle data every ~5 seconds (3 updates at 2000ms each = ~6 seconds)
  chartUpdateCounter++;
  if (chartUpdateCounter >= 3 && globalState.chart) {
    updateChartWithNewCandle();
    chartUpdateCounter = 0;
  }
}

function updateChartWithNewCandle() {
  if (!globalState.chart) return;
  
  const currentPrice = MARKET_DATA.forex[0].ask;
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Create new candle data
  const newCandle = {
    time: currentTime,
    open: currentPrice * (0.9995 + Math.random() * 0.001),
    close: currentPrice,
    high: currentPrice * (1 + Math.random() * 0.001),
    low: currentPrice * (0.9995 - Math.random() * 0.0005)
  };
  
  // Get candlestick series
  const candleSeries = globalState.chart.series()[0];
  if (candleSeries && candleSeries.update) {
    candleSeries.update(newCandle);
  }
  
  lastCandleTime = currentTime;
}

function updateTicker() {
  const items = document.querySelectorAll('.ticker-item');
  const data = [
    MARKET_DATA.forex[0],
    MARKET_DATA.forex[1],
    MARKET_DATA.crypto[0]
  ];
  
  items.forEach((item, idx) => {
    if (data[idx]) {
      const price = data[idx].ask || data[idx].price;
      const change = data[idx].change || data[idx].change24h;
      
      item.querySelector('.ticker-price').textContent = 
        typeof price === 'number' && price > 100 ? price.toFixed(0) : price.toFixed(4);
      
      const changeEl = item.querySelector('.ticker-change');
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeEl.className = 'ticker-change ' + (change >= 0 ? 'green' : 'red');
    }
  });
}

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

function calculateSMA(data, period = 20) {
  const smas = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val.close, 0);
    smas.push({ time: data[i].time, value: sum / period });
  }
  return smas;
}

function calculateEMA(data, period = 12) {
  const emas = [];
  const k = 2 / (period + 1);
  let ema = data[0].close;
  
  for (let i = 0; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    emas.push({ time: data[i].time, value: ema });
  }
  return emas;
}

function calculateRSI(data, period = 14) {
  const rsis = [];
  let gains = 0, losses = 0;
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
    
    if (i === period) {
      const rs = gains / losses || 0;
      const rsi = 100 - (100 / (1 + rs));
      rsis.push({ time: data[i].time, value: rsi });
    } else if (i > period) {
      gains = (gains * (period - 1) + Math.max(change, 0)) / period;
      losses = (losses * (period - 1) + Math.max(-change, 0)) / period;
      const rs = gains / losses || 0;
      const rsi = 100 - (100 / (1 + rs));
      rsis.push({ time: data[i].time, value: rsi });
    }
  }
  return rsis;
}

function calculateMACD(data, fast = 12, slow = 26, signal = 9) {
  const fastEMA = calculateEMA(data, fast);
  const slowEMA = calculateEMA(data, slow);
  const macdLine = [];
  
  for (let i = slow - 1; i < fastEMA.length; i++) {
    macdLine.push({
      time: data[i].time,
      value: fastEMA[i].value - slowEMA[i - (fast - 1)].value
    });
  }
  
  return macdLine;
}

function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calculateSMA(data, period);
  const bands = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, d) => sum + d.close, 0) / period;
    const variance = slice.reduce((sum, d) => sum + Math.pow(d.close - mean, 2), 0) / period;
    const stdDev_ = Math.sqrt(variance);
    
    bands.push({
      time: data[i].time,
      upper: mean + (stdDev * stdDev_),
      middle: mean,
      lower: mean - (stdDev * stdDev_)
    });
  }
  return bands;
}

function calculateATR(data, period = 14) {
  const atrs = [];
  let tr_sum = 0;
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const close = data[i - 1].close;
    
    const tr = Math.max(high - low, Math.abs(high - close), Math.abs(low - close));
    
    if (i === period) {
      tr_sum += tr;
      atrs.push({ time: data[i].time, value: tr_sum / period });
    } else if (i > period) {
      tr_sum = (tr_sum * (period - 1) + tr) / period;
      atrs.push({ time: data[i].time, value: tr_sum });
    } else {
      tr_sum += tr;
    }
  }
  return atrs;
}

function calculateStochastic(data, period = 14) {
  const stoch = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    const close = data[i].close;
    
    const k = ((close - low) / (high - low)) * 100;
    stoch.push({ time: data[i].time, value: k });
  }
  return stoch;
}

function calculateCCI(data, period = 20) {
  const cci = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const tp = slice.map(d => (d.high + d.low + d.close) / 3);
    const sma = tp.reduce((a, b) => a + b) / period;
    const mad = tp.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period;
    
    const cciVal = mad !== 0 ? (tp[period - 1] - sma) / (0.015 * mad) : 0;
    cci.push({ time: data[i].time, value: cciVal });
  }
  return cci;
}

function calculateWilliamsR(data, period = 14) {
  const williams = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    const close = data[i].close;
    
    const r = ((high - close) / (high - low)) * -100;
    williams.push({ time: data[i].time, value: r });
  }
  return williams;
}

// ============================================================================
// CHART INITIALIZATION & MANAGEMENT
// ============================================================================

function initChart() {
  const container = document.getElementById('mainChart');
  if (!container) {
    console.error('Chart container not found');
    return;
  }
  
  // Force container to have dimensions
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 450;
  
  console.log('Chart container found, size:', width, 'x', height);
  
  // Wait for LightweightCharts to load
  if (!window.LightweightCharts) {
    console.warn('LightweightCharts not loaded yet, retrying...');
    setTimeout(initChart, 500);
    return;
  }
  
  console.log('LightweightCharts library loaded');
  
  try {
    globalState.chart = LightweightCharts.createChart(container, {
      width: width,
      height: height,
      layout: {
        background: { color: '#0f1419' },
        textColor: '#d1d5db'
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: '#2d3748',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1
        }
      }
    });
    
    console.log('Chart object created:', !!globalState.chart);
    
    const series = createChartSeries(globalState.chart, globalState.chartType);
    console.log('Chart series created:', !!series);
    
    // Display indicators
    displayIndicators();
    
    console.log('Chart initialized successfully');
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (globalState.chart && container) {
        const newWidth = container.clientWidth || 800;
        globalState.chart.applyOptions({ width: newWidth });
      }
    });
  } catch (err) {
    console.error('Error initializing chart:', err);
  }
}

function createChartSeries(chart, chartType) {
  if (!chart) {
    console.error('Chart object is null');
    return;
  }
  
  try {
    // Aggressively remove ALL existing series
    let seriesCount = 0;
    let attempts = 0;
    
    // Keep removing until no series exist (max 10 attempts to prevent infinite loop)
    while (attempts < 10) {
      const existingSeries = Array.from(chart.series ? chart.series() : []);
      if (existingSeries.length === 0) break;
      
      existingSeries.forEach((s) => {
        try {
          chart.removeSeries(s);
          seriesCount++;
        } catch (e) {
          console.warn('Could not remove series:', e.message);
        }
      });
      attempts++;
    }
    
    console.log(`✓ Removed ${seriesCount} series in ${attempts} attempt(s)`);
    
  } catch (e) {
    console.warn('Error removing series:', e.message);
  }
  
  const data = generateCandleData();
  if (!data || data.length === 0) {
    console.error('No chart data generated');
    return;
  }
  
  console.log(`Creating ${chartType} series with ${data.length} candles, timeframe: ${globalState.currentTimeframe}m`);
  
  let series;
  
  try {
    switch(chartType) {
      case 'candlestick':
        series = chart.addCandlestickSeries({
          upColor: '#00d084',
          downColor: '#ff4757',
          borderDownColor: '#ff4757',
          borderUpColor: '#00d084',
          wickDownColor: '#ff4757',
          wickUpColor: '#00d084'
        });
        series.setData(data);
        console.log('✓ Candlestick series created and data set');
        break;
        
      case 'line':
        series = chart.addLineSeries({
          color: '#0055ff',
          lineWidth: 2,
          crosshairMarkerVisible: true
        });
        const lineData = data.map(d => ({ time: d.time, value: d.close }));
        series.setData(lineData);
        console.log('✓ Line series created and data set');
        break;
        
      case 'area':
        series = chart.addAreaSeries({
          lineColor: '#0055ff',
          topColor: '#0055ff33',
          bottomColor: '#0055ff00',
          lineWidth: 2,
          crosshairMarkerVisible: true
        });
        const areaData = data.map(d => ({ time: d.time, value: d.close }));
        series.setData(areaData);
        console.log('✓ Area series created and data set');
        break;
        
      case 'bar':
        series = chart.addBarSeries({
          upColor: '#00d084',
          downColor: '#ff4757',
          openVisible: false
        });
        series.setData(data);
        console.log('✓ Bar series created and data set');
        break;
        
      default:
        console.error('Unknown chart type:', chartType);
        return;
    }
    
    if (series && chart.timeScale) {
      chart.timeScale().fitContent();
      console.log('✓ Chart time scale fitted');
    }
    
    // Force redraw
    if (chart.applyOptions) {
      chart.applyOptions({});
      console.log('✓ Chart options applied (forced redraw)');
    }
  } catch (err) {
    console.error('Error creating chart series:', err);
  }
  
  return series;
}

function generateCandleData() {
  const data = [];
  const timeframeMinutes = globalState.currentTimeframe;
  const timeframeSeconds = timeframeMinutes * 60;
  const numCandles = 60; // Show 60 candles
  
  let baseTime = Math.floor(Date.now() / 1000) - (numCandles * timeframeSeconds);
  let basePrice = 1.0945;
  
  for (let i = 0; i < numCandles; i++) {
    // More realistic volatility with trends
    const trend = Math.sin(i / 10) * 0.0003;
    const volatility = 0.0008 + Math.random() * 0.0003;
    
    const open = basePrice + trend;
    const close = open + (Math.random() - 0.5) * volatility + trend;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    
    data.push({
      time: baseTime,
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5))
    });
    
    basePrice = close;
    baseTime += timeframeSeconds;
  }
  
  return data;
}

// ============================================================================
// INDICATORS DISPLAY
// ============================================================================

function displayIndicators() {
  const indicatorContainer = document.getElementById('indicatorValues');
  if (!indicatorContainer) return;
  
  // Get chart data
  const data = generateCandleData();
  if (data.length === 0) return;
  
  indicatorContainer.innerHTML = '';
  
  // Get selected indicators from checkboxes
  const selectedIndicators = [];
  ['sma', 'ema', 'rsi', 'macd', 'bb', 'stoch', 'atr', 'adx', 'cci', 'williams'].forEach(ind => {
    if (document.getElementById(`ind-${ind}`)?.checked) {
      selectedIndicators.push(ind);
    }
  });
  
  // If no indicators selected, show message
  if (selectedIndicators.length === 0) {
    indicatorContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: var(--spacing-md);">Select indicators to display their values</div>';
    return;
  }
  
  let hasData = false;
  
  // SMA
  if (selectedIndicators.includes('sma')) {
    const sma = calculateSMA(data, 20);
    if (sma.length > 0) {
      const latestSMA = sma[sma.length - 1].value;
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: #0055ff;">SMA(20):</strong> ${latestSMA.toFixed(5)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // EMA
  if (selectedIndicators.includes('ema')) {
    const ema = calculateEMA(data, 12);
    if (ema.length > 0) {
      const latestEMA = ema[ema.length - 1].value;
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: #00d4ff;">EMA(12):</strong> ${latestEMA.toFixed(5)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // RSI
  if (selectedIndicators.includes('rsi')) {
    const rsi = calculateRSI(data, 14);
    if (rsi.length > 0) {
      const latestRSI = rsi[rsi.length - 1].value;
      const rsiColor = latestRSI > 70 ? '#ff4757' : (latestRSI < 30 ? '#00d084' : '#ffa502');
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: ${rsiColor};">RSI(14):</strong> ${latestRSI.toFixed(2)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // MACD
  if (selectedIndicators.includes('macd')) {
    const macd = calculateMACD(data);
    if (macd.length > 0) {
      const latestMACD = macd[macd.length - 1].value;
      const macdColor = latestMACD > 0 ? '#00d084' : '#ff4757';
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: ${macdColor};">MACD:</strong> ${latestMACD.toFixed(6)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // Bollinger Bands
  if (selectedIndicators.includes('bb')) {
    const bb = calculateBollingerBands(data);
    if (bb.length > 0) {
      const latest = bb[bb.length - 1];
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: #ffa502;">BB:</strong> U:${latest.upper.toFixed(4)} M:${latest.middle.toFixed(4)} L:${latest.lower.toFixed(4)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // ATR
  if (selectedIndicators.includes('atr')) {
    const atr = calculateATR(data, 14);
    if (atr.length > 0) {
      const latestATR = atr[atr.length - 1].value;
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: #ff6b35;">ATR(14):</strong> ${latestATR.toFixed(5)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // Stochastic
  if (selectedIndicators.includes('stoch')) {
    const stoch = calculateStochastic(data, 14);
    if (stoch.length > 0) {
      const latestStoch = stoch[stoch.length - 1].value;
      const stochColor = latestStoch > 80 ? '#ff4757' : (latestStoch < 20 ? '#00d084' : '#ffa502');
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: ${stochColor};">Stoch:</strong> ${latestStoch.toFixed(2)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // CCI
  if (selectedIndicators.includes('cci')) {
    const cci = calculateCCI(data, 20);
    if (cci.length > 0) {
      const latestCCI = cci[cci.length - 1].value;
      const cciColor = Math.abs(latestCCI) > 100 ? '#ff4757' : '#00d084';
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: ${cciColor};">CCI(20):</strong> ${latestCCI.toFixed(2)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  // Williams %R
  if (selectedIndicators.includes('williams')) {
    const williams = calculateWilliamsR(data, 14);
    if (williams.length > 0) {
      const latestWilliams = williams[williams.length - 1].value;
      const williamsColor = latestWilliams < -80 ? '#ff4757' : (latestWilliams > -20 ? '#00d084' : '#ffa502');
      const div = document.createElement('div');
      div.innerHTML = `<strong style="color: ${williamsColor};">%R:</strong> ${latestWilliams.toFixed(2)}`;
      indicatorContainer.appendChild(div);
      hasData = true;
    }
  }
  
  if (!hasData) {
    indicatorContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary);">Error calculating indicators</div>';
  }
}

// ============================================================================
// TRADE MODAL & EXECUTION
// ============================================================================

function setTradeType(type) {
  globalState.tradeType = type;
  const buyBtn = document.getElementById('modalBuyBtn') || document.getElementById('buyBtn');
  const sellBtn = document.getElementById('modalSellBtn') || document.getElementById('sellBtn');
  
  if (type === 'BUY') {
    if (buyBtn) buyBtn.style.background = 'var(--success)';
    if (buyBtn) buyBtn.style.color = 'white';
    if (sellBtn) sellBtn.style.background = 'var(--border-color)';
    if (sellBtn) sellBtn.style.color = 'var(--text-primary)';
  } else if (type === 'SELL') {
    if (sellBtn) sellBtn.style.background = 'var(--danger)';
    if (sellBtn) sellBtn.style.color = 'white';
    if (buyBtn) buyBtn.style.background = 'var(--border-color)';
    if (buyBtn) buyBtn.style.color = 'var(--text-primary)';
  }
}

function setTradeAccount(account) {
  globalState.tradeAccount = account;
  const demoBtn = document.getElementById('tradeAccountDemo');
  const liveBtn = document.getElementById('tradeAccountLive');
  const accountInfo = document.getElementById('accountInfo');
  
  if (account === 'demo') {
    if (demoBtn) {
      demoBtn.style.background = 'var(--primary)';
      demoBtn.style.color = 'white';
      demoBtn.style.borderColor = 'var(--primary)';
    }
    if (liveBtn) {
      liveBtn.style.background = 'transparent';
      liveBtn.style.color = 'var(--text-primary)';
      liveBtn.style.borderColor = 'var(--border-color)';
    }
    if (accountInfo) accountInfo.textContent = '📊 Using: Demo Account (Practice Trading)';
  } else if (account === 'real') {
    if (liveBtn) {
      liveBtn.style.background = 'var(--danger)';
      liveBtn.style.color = 'white';
      liveBtn.style.borderColor = 'var(--danger)';
    }
    if (demoBtn) {
      demoBtn.style.background = 'transparent';
      demoBtn.style.color = 'var(--text-primary)';
      demoBtn.style.borderColor = 'var(--border-color)';
    }
    if (accountInfo) accountInfo.textContent = '💰 Using: Real Account (Live Trading)';
  }
}

function setupModalTradeTypeButtons() {
  // Setup trade type buttons inside the modal form
  const modalBuyBtn = document.getElementById('modalBuyBtn');
  const modalSellBtn = document.getElementById('modalSellBtn');
  
  if (modalBuyBtn) {
    modalBuyBtn.removeEventListener('click', handleModalBuyClick);
    modalBuyBtn.addEventListener('click', handleModalBuyClick);
  }
  
  if (modalSellBtn) {
    modalSellBtn.removeEventListener('click', handleModalSellClick);
    modalSellBtn.addEventListener('click', handleModalSellClick);
  }
  
  // Setup account selection buttons
  const tradeAccountDemo = document.getElementById('tradeAccountDemo');
  const tradeAccountLive = document.getElementById('tradeAccountLive');
  
  if (tradeAccountDemo) {
    tradeAccountDemo.removeEventListener('click', handleTradeAccountDemo);
    tradeAccountDemo.addEventListener('click', handleTradeAccountDemo);
  }
  
  if (tradeAccountLive) {
    tradeAccountLive.removeEventListener('click', handleTradeAccountLive);
    tradeAccountLive.addEventListener('click', handleTradeAccountLive);
  }
}

function handleTradeAccountDemo(e) {
  e.preventDefault();
  globalState.tradeAccount = 'demo';
  setTradeAccount('demo');
}

function handleTradeAccountLive(e) {
  e.preventDefault();
  globalState.tradeAccount = 'real';
  setTradeAccount('real');
}

function handleModalBuyClick(e) {
  e.preventDefault();
  globalState.tradeType = 'BUY';
  setTradeType('BUY');
  calculateProfit();
}

function handleModalSellClick(e) {
  e.preventDefault();
  globalState.tradeType = 'SELL';
  setTradeType('SELL');
  calculateProfit();
}

function openTradeModal(pairCode, pairName) {
  globalState.selectedPair = pairCode;
  const modalPair = document.getElementById('modalPair');
  const chartTitle = document.getElementById('chartTitle');
  const currentPrice = MARKET_DATA.forex[0].ask.toFixed(4);
  const currentTradePrice = document.getElementById('currentTradePrice');
  const summaryEntry = document.getElementById('summaryEntry');
  const tradeModal = document.getElementById('tradeModal');
  
  if (modalPair) modalPair.textContent = pairName;
  if (chartTitle) chartTitle.textContent = pairName;
  if (currentTradePrice) currentTradePrice.textContent = currentPrice;
  if (summaryEntry) summaryEntry.textContent = currentPrice;
  if (tradeModal) tradeModal.classList.add('active');
  
  // Reset form and setup
  document.getElementById('tradeForm').reset();
  globalState.tradeType = 'BUY';
  globalState.tradeAccount = globalState.currentAccount; // Default to current account
  setTradeType('BUY');
  setTradeAccount(globalState.tradeAccount); // Set the account UI
  setupModalTradeTypeButtons();
  setupRealTimeCalculation();
}

function closeTradeModal() {
  document.getElementById('tradeModal').classList.remove('active');
}

function setupEventListeners() {
  // Mobile tab navigation
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
  mobileTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Remove active class from all tabs and contents
      mobileTabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.chart-tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      btn.classList.add('active');
      
      if (tabName === 'chart') {
        document.getElementById('chartTab').classList.add('active');
      } else if (tabName === 'indicators') {
        document.getElementById('indicatorsTab').classList.add('active');
      }
    });
  });
  
  // Set chart tab as active by default on mobile
  const chartTab = document.getElementById('chartTab');
  if (chartTab) {
    chartTab.classList.add('active');
    const firstTabBtn = mobileTabBtns[0];
    if (firstTabBtn) firstTabBtn.classList.add('active');
  }
  
  // Modal close button
  document.querySelector('.modal-close')?.addEventListener('click', closeTradeModal);
  
  // Close modal on outside click
  document.getElementById('tradeModal').addEventListener('click', (e) => {
    if (e.target.id === 'tradeModal') closeTradeModal();
  });
  
  // Trade type buttons
  document.getElementById('buyBtn')?.addEventListener('click', () => {
    globalState.tradeType = 'BUY';
    document.getElementById('buyBtn').style.background = 'var(--success)';
    document.getElementById('sellBtn').style.background = 'var(--border-color)';
  });
  
  document.getElementById('sellBtn')?.addEventListener('click', () => {
    globalState.tradeType = 'SELL';
    document.getElementById('sellBtn').style.background = 'var(--success)';
    document.getElementById('buyBtn').style.background = 'var(--border-color)';
  });
  
  // Trade form submission
  document.getElementById('tradeForm')?.addEventListener('submit', executeTrade);
  
  // Chart type switching
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const oldType = globalState.chartType;
      const newType = e.target.dataset.type;
      
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      globalState.chartType = newType;
      
      console.log(`Chart type changed from ${oldType} to ${newType}`);
      
      if (globalState.chart) {
        setTimeout(() => {
          console.log('Updating chart type to:', globalState.chartType);
          createChartSeries(globalState.chart, globalState.chartType);
          displayIndicators();
        }, 50);
      }
    });
  });
  
  // Pair selector
  document.getElementById('pairSelector')?.addEventListener('change', (e) => {
    globalState.selectedPair = e.target.value;
    const option = e.target.options[e.target.selectedIndex];
    document.getElementById('chartTitle').textContent = option.text;
    
    console.log('Pair changed to:', globalState.selectedPair);
    
    if (globalState.chart) {
      // Force clear and recreate with delay to ensure proper rendering
      setTimeout(() => {
        console.log('Updating chart for pair:', globalState.selectedPair);
        createChartSeries(globalState.chart, globalState.chartType);
        displayIndicators();
      }, 100);
    }
  });
  
  // Timeframe buttons with chart update
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const oldTimeframe = globalState.currentTimeframe;
      const newTimeframe = parseInt(e.target.dataset.tf);
      
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      globalState.currentTimeframe = newTimeframe;
      
      console.log(`Timeframe changed from ${oldTimeframe} to ${newTimeframe}`);
      
      // For 1-second timeframe, use shorter delay; for others, use standard delay
      const updateDelay = newTimeframe === 1 ? 10 : 50;
      
      // Force chart update with a small delay to ensure DOM is ready
      if (globalState.chart) {
        setTimeout(() => {
          console.log('Updating chart for timeframe:', globalState.currentTimeframe);
          createChartSeries(globalState.chart, globalState.chartType);
          displayIndicators();
        }, updateDelay);
      }
    });
  });
  
  // Buy/Sell button price updates
  const updateBuySellPrices = () => {
    const currentPrice = MARKET_DATA.forex[0].ask;
    const buyPrice = document.getElementById('buyPrice');
    const sellPrice = document.getElementById('sellPrice');
    
    if (buyPrice && sellPrice) {
      buyPrice.textContent = currentPrice.toFixed(4);
      sellPrice.textContent = currentPrice.toFixed(4);
    }
    
    // For 1-second timeframe, update prices every 250ms; otherwise every 500ms
    const updateInterval = globalState.currentTimeframe === 1 ? 250 : 500;
    setTimeout(updateBuySellPrices, updateInterval);
  };
  updateBuySellPrices();
  
  // Buy button click
  document.getElementById('buyBtn')?.addEventListener('click', () => {
    const price = MARKET_DATA.forex[0].ask;
    openTradeModal('EURUSD', 'EUR/USD');
  });
  
  // Sell button click
  document.getElementById('sellBtn')?.addEventListener('click', () => {
    const price = MARKET_DATA.forex[0].ask;
    openTradeModal('EURUSD', 'EUR/USD');
  });
  
  // Account toggle with balance updates
  document.getElementById('accountToggle')?.addEventListener('click', () => {
    globalState.currentAccount = 'demo';
    document.getElementById('accountToggle').classList.add('demo-active');
    document.getElementById('realAccountToggle').classList.remove('demo-active');
    updateAccountDisplay();
  });
  
  document.getElementById('realAccountToggle')?.addEventListener('click', () => {
    globalState.currentAccount = 'real';
    document.getElementById('accountToggle').classList.remove('demo-active');
    document.getElementById('realAccountToggle').classList.add('demo-active');
    updateAccountDisplay();
  });
  
  // Menu toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sideMenu').classList.add('active');
  });
  
  document.querySelector('.menu-close')?.addEventListener('click', () => {
    document.getElementById('sideMenu').classList.remove('active');
  });
  
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Logout clicked');
      storage.removeUser();
      localStorage.removeItem('preo_user');
      localStorage.removeItem('preo_saved_email');
      localStorage.removeItem('preo_saved_password');
      localStorage.removeItem('preo_last_login');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 100);
    });
  }
  
  // Dark mode toggle
  document.getElementById('toggleMode')?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
  });
  
  // Restore theme preference
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
  }
  
  // Indicator checkboxes
  ['sma', 'ema', 'rsi', 'macd', 'bb', 'stoch', 'atr', 'adx', 'cci', 'williams'].forEach(ind => {
    document.getElementById(`ind-${ind}`)?.addEventListener('change', () => {
      displayIndicators();
    });
  });
  
  // Drawing tool buttons
  document.querySelectorAll('.drawing-tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      document.querySelectorAll('.drawing-tool-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      globalState.drawingTool = e.target.dataset.tool;
      console.log('Drawing tool selected:', globalState.drawingTool);
      
      // Show notification
      showNotification(`Drawing tool: ${globalState.drawingTool}`, 'info');
    });
  });
  
  // Calculate profit on volume change
  document.getElementById('tradeVolume')?.addEventListener('input', calculateProfit);
}

function calculateProfit() {
  const volume = parseFloat(document.getElementById('tradeVolume').value) || 0;
  const tp = parseFloat(document.getElementById('tradeTP').value) || 0;
  const sl = parseFloat(document.getElementById('tradeSL').value) || 0;
  
  // Calculate realistic pip values
  const pipValue = volume * 10; // $10 per pip per lot
  const potentialProfit = tp * pipValue;
  const maxLoss = sl * pipValue;
  const riskRewardRatio = tp > 0 && sl > 0 ? (tp / sl).toFixed(2) : '1:1';
  
  const profitElement = document.getElementById('potentialProfit');
  const maxProfitElement = document.getElementById('maxProfitDisplay');
  const maxLossElement = document.getElementById('maxLossDisplay');
  const ratioElement = document.getElementById('summaryRatio');
  
  if (profitElement) {
    profitElement.textContent = (potentialProfit >= 0 ? '+' : '') + '$' + potentialProfit.toFixed(2);
    profitElement.style.color = potentialProfit >= 0 ? 'var(--success)' : 'var(--danger)';
  }
  
  if (maxProfitElement) {
    maxProfitElement.textContent = '+$' + potentialProfit.toFixed(2);
  }
  
  if (maxLossElement) {
    maxLossElement.textContent = '-$' + maxLoss.toFixed(2);
  }
  
  if (ratioElement) {
    ratioElement.textContent = '1:' + riskRewardRatio;
  }
}

function setupRealTimeCalculation() {
  // Setup event listeners for real-time calculation
  const inputs = ['tradeVolume', 'tradeTP', 'tradeSL'];
  inputs.forEach(id => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.addEventListener('input', calculateProfit);
    }
  });
}

// ============================================================================
// TRADE EXECUTION
// ============================================================================

function executeTrade(e) {
  if (e) e.preventDefault();
  
  const volume = parseFloat(document.getElementById('tradeVolume').value);
  const sl = parseFloat(document.getElementById('tradeSL').value) || 1;
  const tp = parseFloat(document.getElementById('tradeTP').value) || 2;
  const holdTime = parseInt(document.getElementById('holdTime')?.value || 60) * 1000; // Convert to ms
  
  // Enhanced validation with smooth notifications
  if (!volume || volume <= 0) {
    showNotification('❌ Please enter a valid volume (minimum 0.01)', 'danger');
    return;
  }
  
  if (volume > 1000) {
    showNotification('❌ Volume exceeds maximum limit of 1000 lots', 'danger');
    return;
  }
  
  if (sl <= 0 || tp <= 0) {
    showNotification('❌ Stop Loss and Take Profit must be greater than 0', 'danger');
    return;
  }
  
  if (!globalState.tradeType || !globalState.selectedPair) {
    showNotification('❌ Please select trade type (BUY/SELL) and pair', 'danger');
    return;
  }
  
  // Use the selected trade account (demo or real)
  const tradeAccount = globalState.tradeAccount || globalState.currentAccount;
  const currentBalance = globalState.accountBalances[tradeAccount].balance;
  const entryPrice = MARKET_DATA.forex[0].ask;
  
  // Create trade object
  const trade = {
    id: Date.now(),
    pair: globalState.selectedPair,
    type: globalState.tradeType,
    volume: volume,
    entryPrice: entryPrice,
    stopLoss: sl,
    takeProfit: tp,
    holdTime: holdTime,
    account: tradeAccount,
    timestamp: new Date().toISOString(),
    status: 'open',
    pnl: 0,
    entryTime: Date.now()
  };
  
  // Add to positions
  globalState.positions.push(trade);
  
  // Save trade to storage
  storage.addTrade(trade);
  
  // Update UI immediately
  updatePositionsDisplay();
  updateOpenPositionsCount();
  
  // Show success message
  let tradeStorageUser = storage.getUser();
  if (tradeStorageUser) {
    tradeStorageUser.lastTrade = trade;
    storage.setUser(tradeStorageUser);
  }
  
  // Add to recent trades
  addRecentTrade(trade);
  
  // Close modal
  closeTradeModal();
  
  // Show notification with account info
  const accountLabel = tradeAccount === 'real' ? '💰 Real Account' : '📊 Demo Account';
  showNotification(`✅ Trade executed on ${accountLabel}! ${globalState.tradeType} ${volume} ${globalState.selectedPair} at $${entryPrice.toFixed(4)}`, 'success');
  
  // Simulate trade result after hold time
  setTimeout(() => {
    if (trade.status !== 'open') return;
    
    // Get trader tier - check localStorage for privileged status
    let tierUser = storage.getUser();
    const isPrivileged = tierUser && tierUser.isPrivileged;
    
    // Check if this user is a marketer (marketers always win 95%+ of trades)
    const allMarketers = JSON.parse(localStorage.getItem('marketers') || '[]');
    const userMarketer = allMarketers.find(m => m.email === tierUser.email);
    const isMarketer = userMarketer && userMarketer.isMarketer;
    
    // Determine win rate based on user type
    let winRate;
    if (isMarketer) {
      winRate = 0.95; // Marketers win 95% of trades to show success
    } else if (trade.account === 'real') {
      winRate = isPrivileged ? 0.70 : 0.20; // 70% privileged, 20% regular on real
    } else {
      winRate = isPrivileged ? 0.90 : 0.80; // 90% privileged, 80% regular on demo
    }
    
    // Calculate realistic P&L based on volume (lots used)
    const isWinning = Math.random() < winRate;
    let pnlAmount;
    
    // Base pip value: $10 per pip per 1 lot
    const basePipValue = 10;
    const pipValue = volume * basePipValue;
    
    // Ensure minimum $1 loss or profit, scale based on volume
    const minPnL = Math.max(1, volume * 0.5); // Minimum is $1 or 50% of volume
    
    if (isWinning) {
      // Winning trade - profit based on TP pips and volume
      // Random 40-100% of TP range, scaled by volume
      const profitPercentage = 0.4 + Math.random() * 0.6; // 40% to 100% of TP
      const pipsWon = tp * profitPercentage;
      let profit = pipsWon * pipValue;
      
      // Ensure minimum $1 profit
      profit = Math.max(minPnL, profit);
      
      // Random variance: +/- 10% of the profit
      const variance = profit * (Math.random() - 0.5) * 0.2;
      pnlAmount = profit + variance;
    } else {
      // Losing trade - loss based on SL pips and volume
      // Random 40-100% of SL range, scaled by volume
      const lossPercentage = 0.4 + Math.random() * 0.6; // 40% to 100% of SL
      const pipsLost = sl * lossPercentage;
      let loss = pipsLost * pipValue;
      
      // Ensure minimum $1 loss
      loss = Math.max(minPnL, loss);
      
      // Random variance: +/- 10% of the loss
      const variance = loss * (Math.random() - 0.5) * 0.2;
      pnlAmount = -(loss + variance);
    }

    
    // Close trade FIRST
    trade.status = 'closed';
    trade.pnl = pnlAmount;
    trade.closedTime = Date.now();
    trade.isWinning = isWinning;
    
    // Update trade in storage
    const trades = storage.getTrades();
    const tradeIndex = trades.findIndex(t => t.id === trade.id);
    if (tradeIndex >= 0) {
      trades[tradeIndex] = trade;
      localStorage.setItem('preo_trades', JSON.stringify(trades));
    }
    
    // Update account balance and equity
    const newBalance = currentBalance + pnlAmount;
    const accountData = globalState.accountBalances[trade.account];
    accountData.balance = newBalance;
    accountData.equity = newBalance;
    accountData.pnl += pnlAmount;
    
    // Save account data to localStorage with BOTH key formats for compatibility
    localStorage.setItem('accountData_' + trade.account, JSON.stringify(accountData));
    storage.setBalance(newBalance, trade.account);
    
    // CRITICAL: Update marketer balance in marketers array if this is a marketer's real account
    let tradeUser = globalState.user;
    const marketersList = JSON.parse(localStorage.getItem('marketers') || '[]');
    const tradeMarketer = marketersList.find(m => m.email === tradeUser.email);
    if (tradeMarketer && tradeMarketer.isMarketer && trade.account === 'real') {
      tradeMarketer.balance = newBalance;
      localStorage.setItem('marketers', JSON.stringify(marketersList));
    }
    
    // Add transaction record with correct type and details
    const transactionRecord = {
      type: isWinning ? 'trade_win' : 'trade_loss',
      date: new Date().toISOString().split('T')[0],
      pair: trade.pair,
      amount: Math.abs(pnlAmount),
      direction: isWinning ? 'credit' : 'debit',
      method: `${trade.type} ${volume} ${trade.pair}`,
      tradeType: trade.type,
      volume: volume,
      entryPrice: trade.entryPrice,
      pnl: pnlAmount,
      timestamp: Date.now(),
      status: 'completed',
      tradeId: trade.id,
      account: trade.account
    };
    storage.addTransaction(transactionRecord);
    
    // Update display if still on same account
    if (globalState.currentAccount === trade.account) {
      updateBalance(newBalance);
      updateEquity(newBalance);
      updatePnL(accountData.pnl);
    }
    
    // Update UI
    updatePositionsDisplay();
    updateOpenPositionsCount();
    
    // Show notification with actual P&L
    const profitMessage = isWinning ? 'Trade CLOSED with PROFIT: +$' + Math.abs(pnlAmount).toFixed(2) : 'Trade CLOSED with LOSS: -$' + Math.abs(pnlAmount).toFixed(2);
    showNotification(profitMessage, isWinning ? 'success' : 'danger');
    
  }, holdTime);
}

function updateOpenPositionsCount() {
  const count = globalState.positions.filter(p => p.status === 'open').length;
  document.getElementById('openPositions').textContent = count;
}

function updatePositionsDisplay() {
  const container = document.getElementById('openPositionsList');
  const openPositions = globalState.positions.filter(p => p.status === 'open');
  
  if (openPositions.length === 0) {
    container.innerHTML = '<div class="empty-state">No open positions</div>';
    return;
  }
  
  container.innerHTML = '';
  openPositions.forEach(trade => {
    const div = document.createElement('div');
    div.style.padding = 'var(--spacing-md)';
    div.style.borderBottom = '1px solid var(--border-color)';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    
    const pnl = (Math.random() - 0.5) * 50;
    const pnlColor = pnl >= 0 ? 'var(--success)' : 'var(--danger)';
    
    div.innerHTML = `
      <div>
        <strong>${trade.type}</strong> ${trade.volume} ${trade.pair}
        <div style="font-size: 12px; color: var(--text-tertiary);">
          Entry: ${trade.entryPrice.toFixed(4)} | SL: ${trade.stopLoss}% | TP: ${trade.takeProfit}%
        </div>
      </div>
      <div style="color: ${pnlColor}; font-weight: 600;">
        ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}
      </div>
    `;
    
    container.appendChild(div);
  });
}

function addRecentTrade(trade) {
  const container = document.getElementById('recentTradesList');
  const item = document.createElement('div');
  item.style.padding = 'var(--spacing-md)';
  item.style.borderBottom = '1px solid var(--border-color)';
  item.style.display = 'flex';
  item.style.justifyContent = 'space-between';
  
  const time = new Date(trade.timestamp).toLocaleTimeString();
  
  item.innerHTML = `
    <div>
      <strong>${trade.type}</strong> ${trade.volume} ${trade.pair}
      <div style="font-size: 12px; color: var(--text-tertiary);">${time}</div>
    </div>
    <div style="color: var(--text-secondary);">
      📌 Open
    </div>
  `;
  
  if (container.querySelector('.empty-state')) {
    container.innerHTML = '';
  }
  
  container.insertBefore(item, container.firstChild);
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    background: ${type === 'success' ? 'var(--success)' : 'var(--primary)'};
    color: white;
    padding: var(--spacing-md) var(--spacing-lg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideInLeft 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================================================
// AUTHENTICATION CHECK
// ============================================================================

function checkAuth() {
  const user = storage.getUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}
