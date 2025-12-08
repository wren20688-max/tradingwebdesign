// List of 20+ assets (FX, commodities, indices)
const assets = [
  { symbol:'EURUSD', price:1.0800 },
  { symbol:'GBPUSD', price:1.2400 },
  { symbol:'USDJPY', price:149.50 },
  { symbol:'AUDUSD', price:0.6700 },
  { symbol:'USDCAD', price:1.3400 },
  { symbol:'NZDUSD', price:0.6100 },
  { symbol:'USDCHF', price:0.9100 },
  { symbol:'XAUUSD', price:1940.00 },
  { symbol:'XAGUSD', price:24.50 },
  { symbol:'USOIL', price:79.50 },
  { symbol:'UKOIL', price:87.20 },
  { symbol:'US30', price:33500 },
  { symbol:'US100', price:15450 },
  { symbol:'DAX30', price:16500 },
  { symbol:'FTSE100', price:7800 },
  { symbol:'NIKKEI225', price:30000 },
  { symbol:'S&P500', price:4490 },
  { symbol:'BTCUSD', price:35000 },
  { symbol:'ETHUSD', price:2400 },
  { symbol:'LTCUSD', price:90 },
];

// Function to simulate small random price movements
function simulatePrice(asset){
  const change = (Math.random()-0.5) * (asset.price*0.001); // 0.1% fluctuation
  asset.price = parseFloat((asset.price + change).toFixed(5));
  return asset.price;
}

// Update all prices every second
function updateAllPrices(){
  assets.forEach(a => simulatePrice(a));
}
setInterval(updateAllPrices, 1000);
