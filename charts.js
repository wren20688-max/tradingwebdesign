// Minimal guaranteed simulated chart renderer
(function(){
  try{
    const container = document.getElementById('chart');
    if(!container){ console.warn('charts.js: #chart container not found'); return; }

    // Remove any previous canvas we might have left
    while(container.firstChild) container.removeChild(container.firstChild);

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '500px';
    canvas.width = container.clientWidth || 800;
    canvas.height = 500;
    canvas.id = 'fallback-sim-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // header with asset selector and price
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '6px 8px';
    header.style.fontFamily = 'Segoe UI, Arial';

    const left = document.createElement('div');
    left.style.display = 'flex'; left.style.gap = '8px'; left.style.alignItems='center';
    const select = document.createElement('select');
    select.id = 'sim-asset-select';
    if(typeof assets !== 'undefined'){
      assets.forEach(a=>{ const o=document.createElement('option'); o.value=a.symbol; o.textContent=a.symbol; select.appendChild(o); });
    } else {
      ['EURUSD','USDJPY','GBPUSD'].forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; select.appendChild(o); });
    }
    left.appendChild(select);
    const assetLabel = document.createElement('div'); assetLabel.style.fontWeight='600'; left.appendChild(assetLabel);

    const right = document.createElement('div');
    right.style.fontFamily='monospace';
    const priceLabel = document.createElement('div'); priceLabel.id='sim-price-label'; right.appendChild(priceLabel);

    header.appendChild(left); header.appendChild(right);
    container.insertBefore(header, canvas);

    let mode = 'candle'; // 'candle'|'line'|'bar'
    const btns = { candle: document.getElementById('candleBtn'), line: document.getElementById('lineBtn'), bar: document.getElementById('barBtn') };
    Object.keys(btns).forEach(k=>{ const b=btns[k]; if(b){ b.addEventListener('click', ()=>{ mode=k; draw(); }); }});

    // simple simulated series storage
    let series = [];
    function initSeries(centerPrice){
      series = [];
      const now = Math.floor(Date.now()/1000);
      let p = centerPrice || (typeof assets !== 'undefined' && assets[0] && assets[0].price) || 1.08;
      for(let i=60;i>0;i--){
        const t = now - i*60;
        const open = p + (Math.random()-0.5)*0.002;
        const close = open + (Math.random()-0.5)*0.002;
        const high = Math.max(open,close) + Math.random()*0.001;
        const low = Math.min(open,close) - Math.random()*0.001;
        series.push({time:t,open:parseFloat(open.toFixed(5)),high:parseFloat(high.toFixed(5)),low:parseFloat(low.toFixed(5)),close:parseFloat(close.toFixed(5))});
        p = close;
      }
    }

    function addCandleFromBase(base){
      const last = series[series.length-1];
      const open = last ? last.close : base;
      const close = open + (Math.random()-0.5)*(base*0.0005);
      const high = Math.max(open,close) + Math.abs((Math.random()-0.5)*(base*0.00025));
      const low = Math.min(open,close) - Math.abs((Math.random()-0.5)*(base*0.00025));
      const now = Math.floor(Date.now()/1000);
      const c = { time: now, open: parseFloat(open.toFixed(5)), high: parseFloat(high.toFixed(5)), low: parseFloat(low.toFixed(5)), close: parseFloat(close.toFixed(5)) };
      series.push(c); if(series.length>200) series.shift();
    }

    function draw(){
      // resize canvas to container width
      const w = canvas.width = container.clientWidth || 800;
      const h = canvas.height = 500;
      ctx.clearRect(0,0,w,h);

      if(!series || series.length===0){ ctx.fillStyle='#666'; ctx.font='14px Arial'; ctx.fillText('No data',10,30); return; }

      let min=Infinity,max=-Infinity; series.forEach(d=>{ min=Math.min(min,d.low); max=Math.max(max,d.high); });
      const pad=(max-min)*0.1||0.0001; min-=pad; max+=pad;
      const chartH = h-60; const chartTop=20; const candleW = Math.max(2, Math.floor(w/Math.min(100,series.length))-2);
      const startX = 10;

      if(mode==='line'){
        ctx.beginPath(); ctx.lineWidth=2; ctx.strokeStyle='#00A3FF';
        series.forEach((d,i)=>{ const x=startX + i*(candleW+2) + candleW/2; const y = chartTop + (chartH - ((d.close-min)/(max-min))*chartH); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
      } else {
        series.forEach((d,i)=>{
          const x = startX + i*(candleW+2);
          const yHigh = chartTop + (chartH - ((d.high-min)/(max-min))*chartH);
          const yLow = chartTop + (chartH - ((d.low-min)/(max-min))*chartH);
          const yOpen = chartTop + (chartH - ((d.open-min)/(max-min))*chartH);
          const yClose = chartTop + (chartH - ((d.close-min)/(max-min))*chartH);

          // wick
          ctx.strokeStyle='#333'; ctx.beginPath(); ctx.moveTo(x+candleW/2,yHigh); ctx.lineTo(x+candleW/2,yLow); ctx.stroke();
          const up = d.close>=d.open; ctx.fillStyle = up? '#26a69a':'#ef5350';
          if(mode==='candle') ctx.fillRect(x, Math.min(yOpen,yClose), candleW, Math.max(1,Math.abs(yClose-yOpen)));
          else ctx.fillRect(x + candleW/2 - 1, yHigh, 2, Math.max(1,yLow-yHigh));
        });
      }

      // draw price axis right
      ctx.fillStyle='#222'; ctx.fillRect(w-70, chartTop, 70, chartH);
      ctx.fillStyle='#fff'; ctx.font='12px monospace'; for(let i=0;i<=5;i++){ const v = max - (i/5)*(max-min); const y = chartTop + (i/5)*chartH; ctx.fillText(v.toFixed(5), w-66, y+4); }
    }

    // wire select change and price updates
    select.addEventListener('change', ()=>{ const sym=select.value; const a=(typeof assets!=='undefined')? assets.find(x=>x.symbol===sym):null; initSeries(a? a.price : undefined); draw(); });

    function updatePriceLabel(){ const sym=select.value; const a=(typeof assets!=='undefined')? assets.find(x=>x.symbol===sym):null; const last = series[series.length-1]; const p = a? a.price : (last? last.close : 0); priceLabel.textContent = (p || 0).toFixed(5); assetLabel.textContent = select.value; }

    // initialize
    const initialAsset = select.value || (typeof assets!=='undefined' && assets[0] && assets[0].symbol) || 'EURUSD'; select.value = initialAsset;
    const assetObj = (typeof assets!=='undefined')? assets.find(x=>x.symbol===initialAsset):null;
    initSeries(assetObj? assetObj.price : undefined);
    draw(); updatePriceLabel();

    // periodic updates
    setInterval(()=>{
      const sym = select.value; const a=(typeof assets!=='undefined')? assets.find(x=>x.symbol===sym):null; const base = a? a.price : (series[series.length-1] && series[series.length-1].close) || 1;
      addCandleFromBase(base);
      draw();
    }, 2000);

    setInterval(()=>{ updatePriceLabel(); }, 1000);

    // on resize
    window.addEventListener('resize', ()=>{ draw(); });

    // expose for debugging
    window._simChart = { draw, initSeries };

  }catch(e){ console.error('charts.js minimal renderer error', e); }
})();

