// ── AUTH GUARD ──
const token = localStorage.getItem('eapcet-token');
const userInfo = JSON.parse(localStorage.getItem('eapcet-user') || 'null');
if (!token) { window.location.href = '/login.html'; }

// ── API HELPER ──
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api/progress' + path, opts);
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

// Debounce helper
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── QUOTES ──
const quotes = [
  {q:"Success is the sum of small efforts, repeated day in and day out.",a:"Robert Collier"},
  {q:"The secret of getting ahead is getting started.",a:"Mark Twain"},
  {q:"Don't watch the clock; do what it does. Keep going.",a:"Sam Levenson"},
  {q:"It always seems impossible until it's done.",a:"Nelson Mandela"},
  {q:"Believe you can and you're halfway there.",a:"Theodore Roosevelt"},
  {q:"You don't have to be great to start, but you have to start to be great.",a:"Zig Ziglar"},
  {q:"Hard work beats talent when talent doesn't work hard.",a:"Tim Notke"},
  {q:"The harder you work, the greater you'll feel when you achieve it.",a:"Unknown"},
  {q:"Every champion was once a contender that refused to give up.",a:"Rocky Balboa"},
  {q:"Study while others sleep; work while others loaf.",a:"William Arthur Ward"}
];

// ── THEME ──
let dark = localStorage.getItem('eapcet-theme') !== 'light';
function applyTheme(){
  document.body.setAttribute('data-theme', dark ? '' : 'light');
  document.getElementById('theme-toggle').textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('eapcet-theme', dark ? 'dark' : 'light');
}
document.getElementById('theme-toggle').onclick = () => { dark=!dark; applyTheme(); };
applyTheme();

// Show username in topbar
if (userInfo) {
  const el = document.getElementById('user-name');
  if (el) el.textContent = userInfo.username;
}

// ── LOGOUT ──
function logout() {
  localStorage.removeItem('eapcet-token');
  localStorage.removeItem('eapcet-user');
  window.location.href = '/login.html';
}
document.getElementById('logout-btn').onclick = logout;

// ── COUNTDOWN ──
function updateCountdown(){
  const diff = Math.ceil((new Date('2026-05-18T08:00:00') - new Date()) / 864e5);
  document.getElementById('days-left').textContent = diff > 0 ? diff : 'TODAY!';
}
updateCountdown();

// ── QUOTE ──
const q = quotes[new Date().getDay() % quotes.length];
document.getElementById('daily-quote').innerHTML = `"${q.q}" <strong>— ${q.a}</strong>`;

// ── TODAY FOCUS ──
const todayFocus = [
  {day:'Sunday',subj:'Revision Day',topics:'Full Week Revision + 20 Practice Questions',color:'var(--accent2)'},
  {day:'Monday',subj:'Mathematics — Algebra Part 1',topics:'Functions, Matrices, Complex Numbers',color:'var(--math)'},
  {day:'Tuesday',subj:'Mathematics — Algebra Part 2',topics:"De Moivre's Theorem, Quadratic Expressions",color:'var(--math)'},
  {day:'Wednesday',subj:'Physics — Units & Motion',topics:'Units & Measurements, Motion in Straight Line',color:'var(--phy)'},
  {day:'Thursday',subj:'Mathematics — Trigonometry',topics:'Trig Ratios, Inverse Trig, Properties of Triangles',color:'var(--math)'},
  {day:'Friday',subj:'Chemistry — Atomic Structure',topics:'Atomic Structure & Chemical Bonding',color:'var(--chem)'},
  {day:'Saturday',subj:'Mathematics — Coordinate Geometry',topics:'Straight Lines, Circles, Pair of Lines',color:'var(--math)'}
];
const tf = todayFocus[new Date().getDay()];
document.getElementById('today-content').innerHTML = `
  <div class="focus-day">${tf.day}</div>
  <div class="focus-title" style="color:${tf.color}">${tf.subj}</div>
  <div class="focus-topics">${tf.topics}</div>
`;

// ── NAV ──
function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll(`[data-page="${id}"]`).forEach(el => el.classList.add('active'));
}

// ── WEEK TOGGLE ──
function toggleWeek(id){
  const body = document.getElementById('wb-'+id);
  const chev = document.getElementById('chev-'+id);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open');
  chev.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ── STATE (from API) ──
let dayDone = {}, topicDone = {}, todos = [];
let pomoSess = 0, pomoMins = 0, pomoStreak = 0;

async function loadAllData() {
  const data = await api('GET', '');
  if (!data) return;
  dayDone = data.dayDone || {};
  topicDone = data.topicDone || {};
  todos = data.todos || [];
  const pomo = data.pomodoro || {};
  pomoSess = pomo.sessions || 0;
  pomoMins = pomo.mins_studied || 0;
  pomoStreak = pomo.streak || 0;
  renderDays();
  renderTopics();
  renderTodos();
  updateProgress();
  document.getElementById('pomo-sessions').textContent = pomoSess;
  document.getElementById('pomo-mins').textContent = pomoMins;
  document.getElementById('pomo-streak').textContent = pomoStreak;
}
loadAllData();

// ── DAY CHECK ──
async function toggleDay(id){
  dayDone[id] = !dayDone[id];
  renderDays(); updateProgress();
  saveDays();
}
const saveDays = debounce(() => api('PUT', '/days', { dayDone }), 600);

function renderDays(){
  for(let w=1;w<=3;w++) for(let d=1;d<=7;d++){
    const id=`w${w}-${d}`, el=document.getElementById('dc-'+id);
    if(el){ el.textContent=dayDone[id]?'✓':''; el.classList.toggle('done',!!dayDone[id]); }
  }
}

// ── TOPIC CHECK ──
async function toggleTopic(subj, id){
  const key=subj+'-'+id;
  topicDone[key]=!topicDone[key];
  renderTopics(); updateProgress();
  saveTopics();
}
const saveTopics = debounce(() => api('PUT', '/topics', { topicDone }), 600);

function renderTopics(){
  const counts={math:7,phy:6,chem:6};
  ['math','phy','chem'].forEach(s=>{
    for(let i=1;i<=counts[s];i++){
      const btn=document.getElementById('tc-'+s+'-'+i);
      if(btn){ const done=topicDone[s+'-'+i]; btn.textContent=done?'✓ Done':'Mark Done'; btn.classList.toggle('done',!!done); }
    }
  });
}

// ── PROGRESS ──
function updateProgress(){
  const mathDone=[1,2,3,4,5,6,7].filter(i=>topicDone['math-'+i]).length;
  const phyDone=[1,2,3,4,5,6].filter(i=>topicDone['phy-'+i]).length;
  const chemDone=[1,2,3,4,5,6].filter(i=>topicDone['chem-'+i]).length;
  let dayCount=0;
  for(let w=1;w<=3;w++) for(let d=1;d<=(w<3?7:6);d++) if(dayDone[`w${w}-${d}`]) dayCount++;
  const mp=Math.round(mathDone/7*100), pp=Math.round(phyDone/6*100);
  const cp=Math.round(chemDone/6*100), op=Math.round(dayCount/20*100);
  document.getElementById('math-pct').textContent=mp+'%';
  document.getElementById('phy-pct').textContent=pp+'%';
  document.getElementById('chem-pct').textContent=cp+'%';
  document.getElementById('overall-pct').textContent=op+'%';
  document.getElementById('math-bar').style.width=mp+'%';
  document.getElementById('phy-bar').style.width=pp+'%';
  document.getElementById('chem-bar').style.width=cp+'%';
  document.getElementById('overall-bar').style.width=op+'%';
  document.getElementById('overall-sub').textContent=dayCount+' of 20 days done';
}

// ── SYLLABUS TABS ──
function showSubject(s){
  ['math','phy','chem'].forEach(x=>{
    document.getElementById('syllabus-'+x).style.display=x===s?'grid':'none';
  });
  document.querySelectorAll('.subj-btn').forEach((t,i)=>{
    t.className='subj-btn';
    if(i===0&&s==='math') t.classList.add('am');
    if(i===1&&s==='phy') t.classList.add('ap');
    if(i===2&&s==='chem') t.classList.add('ac');
  });
}

// ── TODO (API-backed) ──
async function addTodo(){
  const inp=document.getElementById('todo-input');
  const subj=document.getElementById('todo-subj').value;
  const text=inp.value.trim();
  if(!text) return;
  inp.value='';
  const newTodo = await api('POST', '/todos', { text, subject: subj });
  if(newTodo && !newTodo.error) { todos.push(newTodo); renderTodos(); }
}

async function toggleTodo(id){
  const t=todos.find(x=>x.id===id); if(t) t.done=!t.done;
  renderTodos();
  await api('PUT', '/todos/'+id, {});
}

async function deleteTodo(id){
  todos = todos.filter(x=>x.id!==id);
  renderTodos();
  await api('DELETE', '/todos/'+id);
}

const tagLabels={math:'📐 Math',phy:'⚡ Physics',chem:'🧪 Chem',gen:'📋 General'};
function renderTodos(){
  const list=document.getElementById('todo-list');
  document.getElementById('todo-pending').textContent=todos.filter(t=>!t.done).length;
  document.getElementById('todo-done-count').textContent=todos.filter(t=>t.done).length;
  if(!todos.length){ list.innerHTML='<div class="empty-state">No tasks yet. Add your first study task above! 📚</div>'; return; }
  list.innerHTML=todos.map(t=>`
    <div class="todo-item ${t.done?'done':''}">
      <div class="todo-chk ${t.done?'on':''}" onclick="toggleTodo(${t.id})">${t.done?'✓':''}</div>
      <div class="todo-txt">${t.text}</div>
      <span class="todo-tag tag-${t.subject}">${tagLabels[t.subject]||'📋'}</span>
      <button class="todo-del" onclick="deleteTodo(${t.id})">✕</button>
    </div>`).join('');
}

// ── POMODORO ──
let pomoDur=25*60, pomoRem=25*60, pomoInt=null, pomoGoing=false;
const modes={focus:{dur:25*60,lbl:'FOCUS',color:'var(--accent)'},short:{dur:5*60,lbl:'SHORT BREAK',color:'var(--chem)'},long:{dur:15*60,lbl:'LONG BREAK',color:'var(--phy)'}};
let curMode='focus';

function setMode(m){
  if(pomoGoing) togglePomo();
  curMode=m; pomoDur=pomoRem=modes[m].dur;
  document.querySelectorAll('.pomo-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('pmb-'+m).classList.add('active');
  document.getElementById('pomo-ring').style.stroke=modes[m].color;
  document.getElementById('pomo-mode-lbl').textContent=modes[m].lbl;
  updatePomoDisplay();
}
function updatePomoDisplay(){
  const m=Math.floor(pomoRem/60), s=pomoRem%60;
  document.getElementById('pomo-time').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const circ=2*Math.PI*100;
  document.getElementById('pomo-ring').style.strokeDashoffset=circ*(1-pomoRem/pomoDur);
}
function togglePomo(){
  if(pomoGoing){
    clearInterval(pomoInt); pomoGoing=false;
    document.getElementById('pomo-start').textContent='Resume';
  } else {
    pomoGoing=true;
    document.getElementById('pomo-start').textContent='Pause';
    pomoInt=setInterval(()=>{
      pomoRem--;
      updatePomoDisplay();
      if(pomoRem<=0){
        clearInterval(pomoInt); pomoGoing=false;
        document.getElementById('pomo-start').textContent='Start';
        if(curMode==='focus'){
          pomoSess++; pomoMins+=Math.round(pomoDur/60);
          document.getElementById('pomo-sessions').textContent=pomoSess;
          document.getElementById('pomo-mins').textContent=pomoMins;
          api('PUT', '/pomodoro', { sessions: pomoSess, mins_studied: pomoMins, streak: pomoStreak, last_date: new Date().toISOString().slice(0,10) });
        }
        try{ new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJiVkHBZVWaJhYl5aF5jiIaOe2ljbIiHjHdpYWeGhY5zamdqiI+JdW5pdoiVh3BxdHiNk4Rxb3V9jZGBb3F4gY2PfHB0eYGOiXh1d36Bi4x4dnh9hoqPdnZ2e4OIkXRydXuBiJB2cnR5gIePdXN1eoGHkHVzdHqBh5B2dHV6goeQdnR2e4KIkXZ0dXuCh5F3dHV7goiRd3R1e4OIknd0dXuDiJN4dXZ8g4iUeHV3fIOMlXl2d3yEjJV6d3h9hI2Wen9+fo2UeHl6foaOm3d5en+HkJt3eXt/iJGceHp8gImSnXh6fIGKk515e32CipSdfHx9g4uVnnx8foOLlp99fX+EjJefgH5/hY2YoIF/gIaOmaGCgICHj5qigoGBiJCbo4OCgomRnKSDg4OKkp2lhISEi5OepYWFhIyUnqaGhoWNlZ+nh4eGjpagroiIh4+XoK+JiYiQmKGwiomJkZmisYuKipKao7KMi4uTm6Szjo2MlJylta+Oj42Vna62r4+PjpaeqLewkJCPl5+puLGRkZCYoKq5spKSkZmhq7qzk5OSmqKsu7SUlJObo623lJWUm6Wuuba1lpWVnKaurri3l5eWna+wuLqYmJeesLG5u5mZmZ+ytrq7mpqZoLK2ury').play();}catch(e){}
      }
    },1000);
  }
}
function resetPomo(){
  clearInterval(pomoInt); pomoGoing=false;
  pomoRem=pomoDur;
  document.getElementById('pomo-start').textContent='Start';
  updatePomoDisplay();
}
updatePomoDisplay();
