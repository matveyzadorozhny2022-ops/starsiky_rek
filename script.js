// script.js
// Настройки
const GIFT_COUNT = 3; // <-- Укажите реальное количество файлов в папке gifts (1.mp4 .. GIFT_COUNT.mp4)
const CHROMA = {r:0,g:255,b:0,thresh:80}; // зелёный экран #00ff00, thresh регулирует чувствительность

// Элементы
const buttonVideo = document.getElementById('buttonVideo');
const buttonCanvas = document.getElementById('buttonCanvas');
const giftCanvas = document.getElementById('giftCanvas');
const message = document.getElementById('message');

const bCtx = buttonCanvas.getContext('2d');
const gCtx = giftCanvas.getContext('2d');

let tapCount = 0;
let exploded = false;
let giftVideo = null;

// Полезные функции
function isGreen(r,g,b){
  // сравнение: зеленый канал существенно больше чем R и B
  return (g - Math.max(r,b)) > 60 && g > 100;
}

function chromaKeyDraw(video, ctx, canvas){
  if(video.paused || video.ended) return;
  try{
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const id = ctx.getImageData(0,0,canvas.width,canvas.height);
    const d = id.data;
    for(let i=0;i<d.length;i+=4){
      const r=d[i], g=d[i+1], b=d[i+2];
      // простой хромакей: если зеленый намного больше — сделать прозрачным
      if(isGreen(r,g,b)){
        d[i+3]=0; // alpha
      }
    }
    ctx.putImageData(id,0,0);
  }catch(e){
    // cross-origin issues may happen; ensure videos are served with crossorigin if needed
    console.warn('chroma draw error', e);
  }
}

function loopButtonRender(){
  chromaKeyDraw(buttonVideo, bCtx, buttonCanvas);
  requestAnimationFrame(loopButtonRender);
}

function loopGiftRender(){
  if(giftVideo){
    chromaKeyDraw(giftVideo, gCtx, giftCanvas);
    if(!giftVideo.paused && !giftVideo.ended){
      requestAnimationFrame(loopGiftRender);
    }
  }
}

// Анимация при нажатии: плавное уменьшение + возвращение
function tapAnimate(){
  buttonCanvas.style.transition = 'transform 120ms cubic-bezier(.22,.9,.28,1)';
  buttonCanvas.style.transform = 'scale(0.86)';
  setTimeout(()=>{
    buttonCanvas.style.transform = 'scale(1)';
  },120);
}

// Взрыв и показ подарка
function explodeAndShowGift(){
  if(exploded) return;
  exploded = true;
  // добавим класс для эффекта
  buttonCanvas.classList.add('explode');
  // через небольшой таймаут убрать кнопку и показать подарок
  setTimeout(()=>{
    buttonCanvas.style.opacity = '0';
    showRandomGift();
  },420);
}

function showRandomGift(){
  const idx = Math.floor(Math.random()*GIFT_COUNT) + 1;
  const path = `gifts/${idx}.mp4`;

  giftVideo = document.createElement('video');
  giftVideo.src = path;
  giftVideo.crossOrigin = 'anonymous';
  giftVideo.muted = true;
  giftVideo.playsInline = true;
  giftVideo.loop = false;

  // подгоняем canvas под соотношение видео после метаданных
  giftVideo.addEventListener('loadedmetadata', ()=>{
    // сохранить пропорции
    const w = giftVideo.videoWidth;
    const h = giftVideo.videoHeight;
    const ratio = w/h;
    // ставим размеры canvas
    giftCanvas.width = 900; // internal resolution для качества
    giftCanvas.height = Math.round(900 / ratio);

    // покажем canvas
    giftCanvas.style.opacity = '1';
    giftCanvas.style.transform = 'translate(-50%,-50%) scale(1)';
    // запустим отрисовку
    giftVideo.play().catch(()=>{});
    loopGiftRender();

    // появление текста
    setTimeout(()=>{
      message.classList.remove('hidden');
      message.classList.add('show');
    }, 450);

    // через некоторое время можно воссоздать кнопку — если нужно
  });

  giftVideo.addEventListener('ended', ()=>{
    // можно показать кнопку заново или оставить как есть
    // для простоты: после окончания подарка задержка и убрать текст
    setTimeout(()=>{
      message.classList.remove('show');
      message.classList.add('hidden');
    },2000);
  });
}

// Инициализация
function init(){
  // установим внутреннее разрешение canvas чтобы сохранить качество
  buttonCanvas.width = 640;
  buttonCanvas.height = 360;

  // стартуем видео кнопки
  buttonVideo.play().catch(()=>{
    // autoplay может быть заблокирован; но видео будет нарисовано при первом взаимодействии
  });
  requestAnimationFrame(loopButtonRender);

  // обработчики клика / тапа
  const onTap = (e)=>{
    if(exploded) return;
    tapCount++;
    tapAnimate();
    if(tapCount>=5){
      explodeAndShowGift();
    }
  };

  buttonCanvas.addEventListener('click', onTap);
  buttonCanvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); onTap(); }, {passive:false});
  // клавиша Enter/Space
  buttonCanvas.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); onTap(); } });

  // подсказка: если autoplay заблокирован, при первом таче — запустить buttonVideo
  buttonCanvas.addEventListener('click', ()=>{ if(buttonVideo.paused) buttonVideo.play().catch(()=>{}); });
}

window.addEventListener('load', init);

// ========== Рекомендации по улучшению/настройке ===========
// 1) Укажите реальное GIFT_COUNT.
// 2) Если ваши mp4 имеют другой размер — можно подстроить canvas.width/height или использовать css для контроля размеров.
// 3) Если видео не отрисовывается из-за CORS — убедитесь, что сервер отдаёт заголовок "Access-Control-Allow-Origin: *" для mp4 файлов.
// 4) Чувствительность хромакея можно менять: функция isGreen / порог (60, 100) — поэкспериментируйте.
