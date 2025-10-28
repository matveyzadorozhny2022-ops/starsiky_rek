(() => {
  // Конфигурация
  const START = 990;
  const MAX = 1000;
  const PRESENT_COUNT = 8;
  const STAR_IMG_PATH = 'star.png';

  // DOM элементы
  const starBtn = document.getElementById('starBtn');
  const starImg = document.getElementById('starImg');
  const ripple = starBtn && starBtn.querySelector('.ripple');
  const neonCenter = document.getElementById('neonCenter');

  const presentCard = document.getElementById('presentCard');
  const presentImg = document.getElementById('presentImg');
  const presentPrice = document.getElementById('presentPrice');
  const sellBtn = document.getElementById('sellBtn');

  const confettiCanvas = document.getElementById('confetti');
  const saleMessage = document.getElementById('saleMessage');
  const saleInner = document.getElementById('saleInner');

  // state
  let count = START;
  let disabledWhilePresent = false;
  let particles = []; // active particles
  let rafId = null;
  let sellBurstPlayed = false; // блокируем повторный burst при продаже

  if (starImg) starImg.src = STAR_IMG_PATH;

  // --- Canvas sizing и оптимизация DPR ---
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function resizeCanvas(){
    if(!confettiCanvas) return;
    // Ограничиваем DPR чтобы не создавать огромные bitmap-ы на high-DPR устройствах
    const maxDPR = 1.5;
    const dpr = clamp(window.devicePixelRatio || 1, 1, maxDPR);
    const w = confettiCanvas.clientWidth;
    const h = confettiCanvas.clientHeight;
    confettiCanvas.width = Math.round(w * dpr);
    confettiCanvas.height = Math.round(h * dpr);
    confettiCanvas.style.width = w + 'px';
    confettiCanvas.style.height = h + 'px';
    const ctx = confettiCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // скейлим контекст один раз
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // --- Эффекты UI ---
  function rippleEffect(){
    if(!ripple) return;
    ripple.style.transition = 'none';
    ripple.style.transform = 'scale(0.2)';
    ripple.style.opacity = '0.95';
    void ripple.offsetWidth;
    ripple.style.transition = 'transform .86s cubic-bezier(.16,.84,.32,1), opacity .86s';
    ripple.style.transform = 'scale(2.2)';
    ripple.style.opacity = '0';
    setTimeout(()=>{ ripple.style.transform='scale(0)'; ripple.style.opacity='0'; }, 880);
  }
  function pulse(el){
    if(!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    setTimeout(()=> el.classList.remove('pulse'), 900);
  }
  function starPressAnim(){
    if (!starImg) return;
    starImg.animate([
      { transform: 'scale(1) rotate(0deg)' },
      { transform: 'scale(1.18) rotate(-8deg)' },
      { transform: 'scale(.94) rotate(4deg)' },
      { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 760, easing: 'cubic-bezier(.16,.84,.32,1)' });
    if (neonCenter){
      neonCenter.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(1.12)', opacity: 0.98 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
      ], { duration: 760, easing: 'ease-out' });
    }
    rippleEffect();
    pulse(starImg);
  }

  // --- Particles (падающие звезды сверху вниз) ---
  // Оптимизированный рендер: единый RAF, минимальные аллокации в цикле
  const ctx = confettiCanvas ? confettiCanvas.getContext('2d') : null;

  function createParticles(amount = 36){
    if (!ctx) return;
    resizeCanvas();
    const W = confettiCanvas.clientWidth;
    const H = confettiCanvas.clientHeight;
    const color = '#FFD93D'; // один цвет
    for (let i = 0; i < amount; i++){
      const size = 10 + Math.random()*18; // больше, вариативность
      const x = Math.random() * W;
      const y = - (Math.random()*100 + 10); // стартуют сверху за пределами canvas
      const vx = (Math.random()-0.5) * 20; // небольшое боковое движение
      const vy = 60 + Math.random()*120; // падают вниз (положительная скорость)
      const rot = Math.random() * Math.PI*2;
      const vrot = (Math.random()-0.5)*0.03;
      const life = 2000 + Math.random()*1400; // ms
      particles.push({ x, y, vx, vy, size, rot, vrot, birth: performance.now(), life, color });
    }
    // старт RAF если ещё не запущен
    if (!rafId) stepParticles();
  }

  function drawRoundedStar(x, y, spikes, outerR, innerR, rotation, color){
    // рисуем звезду с rounded corners (lineJoin=round) чтобы края были "тупые"
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, -outerR);
    for (let i = 0; i < spikes; i++){
      ctx.rotate(Math.PI / spikes);
      ctx.lineTo(0, -innerR);
      ctx.rotate(Math.PI / spikes);
      ctx.lineTo(0, -outerR);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.restore();
  }

  function stepParticles(){
    if (!ctx) return;
    const now = performance.now();
    const W = confettiCanvas.clientWidth;
    const H = confettiCanvas.clientHeight;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    // update
    let aliveCount = 0;
    for (let i = 0; i < particles.length; i++){
      const p = particles[i];
      const age = now - p.birth;
      if (age > p.life || p.y - p.size > H + 60){
        // remove particle by swapping with last (эффективно)
        particles[i] = particles[particles.length - 1];
        particles.pop();
        i--;
        continue;
      }
      aliveCount++;
      // integrate (using ms-based velocities scaled)
      const dt = 16.666; // approx frame ms - stable integration avoids expensive timestamp deltas
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.vy += 18 * (dt / 1000); // gravity stronger for более эффектного падения
      p.rot += p.vrot * (dt / 16.666);
      const alpha = 1 - Math.min(1, age / p.life);
      ctx.globalAlpha = alpha;
      // рисуем звезду (5-spike) с закруглёнными углами
      drawRoundedStar(p.x, p.y, 5, p.size, p.size * 0.54, p.rot, p.color);
      ctx.globalAlpha = 1;
    }

    if (particles.length > 0){
      rafId = requestAnimationFrame(stepParticles);
    } else {
      rafId = null;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // Распространённая проверка: не вызывать партиклы слишком часто
  function starBurstTopToBottom(amount = 36){
    // не запускаем, если уже есть активные частицы (чтобы не нагружать)
    if (particles.length > 0) return;
    createParticles(amount);
  }

  // --- Present show/hide ---
  function showPresent(){
    if(!presentCard || !presentImg || !presentPrice) return;
    const idx = Math.floor(Math.random()*PRESENT_COUNT) + 1;
    presentImg.src = `present${idx}.jpeg`;
    const price = Math.floor(1000 + Math.random()*(15000 - 1000));
    presentPrice.textContent = `${price.toLocaleString('ru-RU')} ⭐`;

    // Убираем любые контуры/тени на карточке (дублируем принудительно)
    presentCard.style.boxShadow = 'none';
    presentCard.style.border = '0';
    presentCard.style.outline = 'none';
    presentImg.style.boxShadow = 'none';
    presentImg.style.border = '0';
    presentImg.style.outline = 'none';

    presentCard.classList.remove('hidden');
    presentCard.classList.add('visible');

    presentImg.animate([{ transform: 'translateY(40px) scale(.96)', opacity:0 }, { transform: 'translateY(0) scale(1)', opacity:1 }], { duration: 760, easing: 'cubic-bezier(.16,.84,.32,1)' });
    presentPrice.animate([{ transform: 'translateY(24px)', opacity:0 }, { transform: 'translateY(0)', opacity:1 }], { duration: 640, easing: 'ease-out', delay: 120 });

    // show sell button
    sellBtn.classList.remove('transparent');
    sellBtn.style.pointerEvents = 'auto';
    sellBtn.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 640, easing: 'cubic-bezier(.2,.9,.3,1)', delay: 200 });

    // Disable star while present visible
    disabledWhilePresent = true;
    starBtn.style.pointerEvents = 'none';
    sellBurstPlayed = false; // allow burst for next sale
  }

  function hidePresent(){
    if(!presentCard) return;
    presentCard.classList.remove('visible');
    presentCard.classList.add('hidden');
    disabledWhilePresent = false;
    starBtn.style.pointerEvents = 'auto';
  }

  // --- Sell logic (без повторной звёздной анимации) ---
  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

  async function onSell(){
    if(!sellBtn || !presentImg || !presentPrice) return;
    if (sellBtn.disabled) return;
    sellBtn.disabled = true;

    sellBtn.classList.add('filling');
    sellBtn.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-8px) scale(1.02)' }, { transform: 'translateY(0) scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)' });

    // через 700ms - улёт подарка
    setTimeout(()=> {
      presentImg.animate([
        { transform: 'translateY(0) scale(1) rotate(0deg)', opacity:1 },
        { transform: 'translateY(-360px) translateX(40px) scale(.42) rotate(18deg)', opacity:0 }
      ], { duration: 1100, easing: 'cubic-bezier(.16,.84,.32,1)', fill: 'forwards' });

      presentCard.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity:1 },
        { transform: 'translate(-50%,-140%) scale(.8)', opacity:0 }
      ], { duration: 1100, easing: 'cubic-bezier(.16,.84,.32,1)', fill: 'forwards' });
    }, 700);

    // запуск звездного дождя один раз (если ещё не запускали)
    if (!sellBurstPlayed) {
      // запускаем сверху вниз (большая интенсивность)
      starBurstTopToBottom(48);
      sellBurstPlayed = true;
    }

    // ждём окончания fill (2200ms)
    await wait(2300);
    sellBtn.classList.remove('filling');
    sellBtn.classList.add('filled');

    // парсим цену и используем её как профит (точно такой же формат)
    const priceText = presentPrice.textContent || '';
    const priceNumber = parseInt(priceText.replace(/\s/g,'').replace(/[^0-9]/g,''), 10) || 0;
    const priceDisplay = `${priceNumber.toLocaleString('ru-RU')} ⭐`;

    // Показываем центрированное сообщение с тем же числом (по центру)
    if (saleInner){
      // создаём содержимое: первая строка — крупно "Звезды зачислены на баланс", вторая — прибыль (как цена)
      saleInner.innerHTML = `<div style="font-size:18px;font-weight:800;color:rgba(255,230,160,0.98)">Звезды зачислены на баланс</div><div class="profit-large">${priceDisplay}</div>`;
    }
    saleMessage.classList.add('visible');

    // Центрированный плавающий текст +N (тоже показываем цену)
    const gain = document.createElement('div');
    gain.className = 'floating-gain';
    gain.style.left = '50%';
    gain.style.top = '46%';
    gain.style.textAlign = 'center';
    gain.innerHTML = `<div style="font-weight:900;color:var(--accent);font-size:24px">${priceDisplay}</div><div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:6px">зачислено</div>`;
    document.body.appendChild(gain);

    requestAnimationFrame(()=> {
      gain.style.opacity = '1';
      gain.style.transform = 'translateX(-50%) translateY(-26px)';
      gain.style.transition = 'all 1100ms cubic-bezier(.16,.84,.32,1)';
    });

    // Даём время пользователю увидеть
    await wait(1600);

    // скрываем уведомления
    saleMessage.classList.remove('visible');
    saleMessage.classList.add('hidden');

    gain.style.opacity = '0';
    gain.style.transform = 'translateX(-50%) translateY(-120px) scale(.9)';
    setTimeout(()=> { try{ document.body.removeChild(gain); }catch(e){} }, 900);

    // Сбрасываем present, кнопку и состояние
    hidePresent();
    sellBtn.classList.remove('filled');
    sellBtn.disabled = false;
    count = START;
  }

  // --- max reached handler ---
  async function onReachMax(){
    if (starImg){
      starImg.animate([
        { transform: 'scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'scale(1.6) rotate(18deg)', opacity: 1 },
        { transform: 'scale(0) rotate(40deg)', opacity: 0 }
      ], { duration: 900, easing: 'cubic-bezier(.16,.84,.32,1)', fill: 'forwards' });
    }
    if (neonCenter){
      neonCenter.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(1.36)', opacity: 0.95 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
      ], { duration: 940, easing: 'ease-out' });
    }
    // большие звёзды (но также сверху-вниз чтобы не нагружать систему)
    starBurstTopToBottom(72);
    await wait(520);
    showPresent();
  }

  // --- Tap handler ---
  function updateCounter(){ pulse(starImg); }
  function handleStarTap(e){
    if(e && e.preventDefault) e.preventDefault();
    if (disabledWhilePresent) return;
    if (count >= MAX) return;
    count = Math.min(MAX, count + 1);
    updateCounter();
    starPressAnim();
    if (count === MAX) onReachMax();
  }

  // --- Listeners ---
  if (starBtn){
    starBtn.addEventListener('click', handleStarTap, { passive:false });
    starBtn.addEventListener('touchstart', handleStarTap, { passive:false });
  }
  if (sellBtn){
    sellBtn.addEventListener('click', (e)=>{ e.preventDefault(); onSell(); });
    sellBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); onSell(); }, { passive:false });
  }

  // breathing neon (легкая анимация)
  setInterval(()=> {
    if(!neonCenter) return;
    neonCenter.style.transform = `translate(-50%,-50%) scale(${1 + 0.01*Math.sin(Date.now()/900)})`;
  }, 120);

  // expose debug helpers
  window._stars = {
    setCount(v){ count = v; updateCounter(); },
    getCount(){ return count; },
    triggerStars(amount){ starBurstTopToBottom(amount || 36); }
  };

})();
