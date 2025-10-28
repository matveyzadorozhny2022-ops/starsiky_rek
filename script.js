/* Рабочая финальная версия:
   - star tap (click + touchstart) добавляет +1
   - при достижении MAX: мощная анимация, confetti, появление present (center)
   - подарки формата .jpeg: presents/present1.jpeg ...
   - sell button wide, anim-color, resets counter and показывает центр. */
(() => {
  const START = 990;
  const MAX = 1000;
  const PRESENT_COUNT = 8; // <- если у тебя другое число, измени сюда
  const STAR_IMG_PATH = 'assets/star.png';

  // DOM
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

  const countEl = document.getElementById('count');
  const maxEl = document.getElementById('max');
  const countDisplay = document.getElementById('countDisplay');

  // state
  let count = START;
  countEl.textContent = count;
  if (maxEl) maxEl.textContent = MAX;
  if (starImg) starImg.src = STAR_IMG_PATH;

  // canvas sizing
  function resizeCanvas() {
    if (!confettiCanvas) return;
    confettiCanvas.width = confettiCanvas.clientWidth * devicePixelRatio;
    confettiCanvas.height = confettiCanvas.clientHeight * devicePixelRatio;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // small helper to animate pulses
  function pulse(el){
    if(!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    setTimeout(()=> el.classList.remove('pulse'), 520);
  }

  // ripple effect
  function rippleEffect(){
    if(!ripple) return;
    ripple.style.transition = 'none';
    ripple.style.transform = 'scale(0)';
    ripple.style.opacity = '0.9';
    void ripple.offsetWidth;
    ripple.style.transition = 'transform .62s cubic-bezier(.2,.9,.3,1), opacity .62s';
    ripple.style.transform = 'scale(1.8)';
    ripple.style.opacity = '0';
    setTimeout(()=>{ ripple.style.transform='scale(0)'; ripple.style.opacity='0'; }, 640);
  }

  // confetti engine (rectangles)
  function confettiBurst(amount=100){
    if(!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');
    resizeCanvas();
    const W = confettiCanvas.width;
    const H = confettiCanvas.height;
    ctx.clearRect(0,0,W,H);
    const parts = [];
    for(let i=0;i<amount;i++){
      parts.push({
        x: Math.random()*W,
        y: Math.random()*H/3,
        w: (6 + Math.random()*10) * devicePixelRatio,
        h: (4 + Math.random()*6) * devicePixelRatio,
        vy: (2 + Math.random()*6) * devicePixelRatio,
        color: `hsl(${30 + Math.random()*40}deg 90% 60%)`
      });
    }
    let t=0, raf;
    function step(){
      t++;
      ctx.clearRect(0,0,W,H);
      for(const p of parts){
        p.y += p.vy;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
      if (t < 140) raf = requestAnimationFrame(step);
      else ctx.clearRect(0,0,W,H);
    }
    step();
    setTimeout(()=> { try{ cancelAnimationFrame(raf);}catch(e){} }, 3500);
  }

  // update counter with animation
  function updateCounter(){
    if (!countEl) return;
    countEl.textContent = count;
    pulse(countDisplay || countEl);
  }

  // star press animation improved
  function starPressAnim(){
    if (!starImg) return;
    starImg.animate([
      { transform: 'scale(1) rotate(0deg)' },
      { transform: 'scale(1.14) rotate(-6deg)' },
      { transform: 'scale(.98) rotate(3deg)' },
      { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)' });

    if (neonCenter){
      neonCenter.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(1.06)', opacity: 0.98 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
      ], { duration: 520, easing: 'ease-out' });
    }

    rippleEffect();
    pulse(countDisplay);
  }

  // show central present
  function showPresent(){
    if(!presentCard || !presentImg || !presentPrice) return;
    const idx = Math.floor(Math.random()*PRESENT_COUNT) + 1;
    presentImg.src = `presents/present${idx}.jpeg`;
    const price = Math.floor(1000 + Math.random()*(15000 - 1000));
    presentPrice.textContent = `${price.toLocaleString('ru-RU')} ⭐`;

    presentCard.classList.remove('hidden');
    presentCard.classList.add('visible');

    // animate present children
    presentImg.animate([{ transform: 'translateY(40px) scale(.96)', opacity:0 }, { transform: 'translateY(0) scale(1)', opacity:1 }], { duration: 640, easing: 'cubic-bezier(.2,.9,.3,1)' });
    presentPrice.animate([{ transform: 'translateY(20px)', opacity:0 }, { transform: 'translateY(0)', opacity:1 }], { duration: 520, easing: 'ease-out', delay: 120 });
    sellBtn.animate([{ transform: 'translateY(24px) scale(.98)', opacity:0 }, { transform: 'translateY(0) scale(1)', opacity:1 }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)', delay: 220 });

    // disable star while present visible
    starBtn.disabled = true;
    starBtn.style.pointerEvents = 'none';
  }

  // hide present
  function hidePresent(){
    if(!presentCard) return;
    presentCard.classList.remove('visible');
    presentCard.classList.add('hidden');

    // re-enable star
    starBtn.disabled = false;
    starBtn.style.pointerEvents = 'auto';
  }

  // sell action
  async function onSell(){
    if(!sellBtn) return;
    sellBtn.disabled = true;
    sellBtn.classList.add('anim-color');

    // little lift
    sellBtn.animate([{ transform:'translateY(0)' }, { transform:'translateY(-6px)' }, { transform:'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)'});

    confettiBurst(140);

    // show sale message centered
    saleMessage.classList.remove('hidden');
    saleMessage.classList.add('visible');

    await wait(1700);

    saleMessage.classList.remove('visible');
    saleMessage.classList.add('hidden');

    sellBtn.classList.remove('anim-color');
    sellBtn.disabled = false;

    hidePresent();

    // reset counter to START
    count = START;
    updateCounter();
  }

  // when reach MAX
  async function onReachMax(){
    // big star blast
    if (starImg){
      starImg.animate([
        { transform: 'scale(1) rotate(0deg)', opacity: 1 },
        { transform: 'scale(1.6) rotate(18deg)', opacity: 1 },
        { transform: 'scale(0) rotate(40deg)', opacity: 0 }
      ], { duration: 700, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
    }

    if (neonCenter){
      neonCenter.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(-50%,-50%) scale(1.36)', opacity: 0.95 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
      ], { duration: 740, easing: 'ease-out' });
    }

    confettiBurst(160);
    await wait(520);

    showPresent();
  }

  // helpers
  function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

  // tap handler (click + touch)
  function handleStarTap(e){
    if(e && e.preventDefault) e.preventDefault();
    if (count >= MAX) return;
    count = Math.min(MAX, count + 1);
    updateCounter();
    starPressAnim();
    if (count === MAX) onReachMax();
  }

  // listeners
  if (starBtn){
    starBtn.addEventListener('click', handleStarTap, { passive:false });
    starBtn.addEventListener('touchstart', handleStarTap, { passive:false });
  }
  if (sellBtn){
    sellBtn.addEventListener('click', onSell);
    sellBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); onSell(); }, { passive:false });
  }

  // initial breathing neon
  setInterval(()=> {
    if(!neonCenter) return;
    neonCenter.style.transform = `translate(-50%,-50%) scale(${1 + 0.01*Math.sin(Date.now()/800)})`;
  }, 120);

  // ensure canvas
  resizeCanvas();

  // expose debug
  window._stars = {setCount(v){ count = v; updateCounter(); }, getCount(){ return count; }};

})();