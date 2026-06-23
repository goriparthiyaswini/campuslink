// nav.js - Shared navigation for all pages
(function() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const currentPage = location.pathname.split('/').pop().replace('.html','') || 'index';

  const pages = [
    { id:'feed',       icon:'🏠', label:'Feed',      href:'feed.html' },
    { id:'discover',   icon:'🔍', label:'Discover',  href:'discover.html' },
    { id:'chat',       icon:'💬', label:'Chat',      href:'chat.html' },
    { id:'discussions',icon:'📢', label:'Forum',     href:'discussions.html' },
    { id:'leaderboard',icon:'🏆', label:'Leaders',   href:'leaderboard.html' },
    { id:'profile',    icon:'👤', label:'Profile',   href:'profile.html' },
    { id:'notifications',icon:'🔔',label:'Alerts',   href:'notifications.html' },
    { id:'chatbot',      icon:'🤖', label:'CampusBot', href:'chatbot.html' },
  ];

  if (user.role === 'admin') {
    pages.push({ id:'admin', icon:'⚙️', label:'Admin', href:'admin.html' });
  }

  const navHTML = `
    <nav class="cl-nav">
      <div class="cl-nav-logo">
        <span class="cl-logo-text">CampusLink 🎓</span>
      </div>
      <div class="cl-nav-links">
        ${pages.map(p => `
          <a href="${p.href}" class="cl-nav-link ${currentPage===p.id?'active':''}" title="${p.label}">
            <span class="cl-nav-icon">${p.icon}</span>
            <span class="cl-nav-label">${p.label}</span>
          </a>
        `).join('')}
      </div>
      <div class="cl-nav-user">
        <div class="cl-avatar-sm">${user.name ? user.name[0].toUpperCase() : '?'}</div>
        <div class="cl-user-info">
          <span class="cl-user-name">${user.name || 'Student'}</span>
          <span class="cl-user-college">${user.college || ''}</span>
        </div>
        <button class="cl-logout-btn" onclick="logout()" title="Logout">🚪</button>
      </div>
    </nav>
    <style>
      .cl-nav {
        position:fixed; top:0; left:0; right:0; z-index:1000;
        display:flex; align-items:center; gap:8px;
        padding:0 20px;
        height:62px;
        background:rgba(15,15,26,0.92);
        backdrop-filter:blur(20px);
        border-bottom:1px solid rgba(255,255,255,0.07);
      }
      .cl-nav-logo { flex-shrink:0; }
      .cl-logo-text {
        font-family:'Pacifico',cursive;
        font-size:1.3rem;
        background:linear-gradient(135deg,#FF6B9D,#9B59F5,#06D6A0);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
      }
      .cl-nav-links { display:flex; align-items:center; gap:2px; flex:1; justify-content:center; }
      .cl-nav-link {
        display:flex; align-items:center; gap:5px;
        padding:6px 12px; border-radius:10px;
        text-decoration:none; color:#8888AA;
        font-family:'Nunito',sans-serif; font-size:0.82rem; font-weight:700;
        transition:all 0.2s;
      }
      .cl-nav-link:hover, .cl-nav-link.active {
        background:rgba(155,89,245,0.15);
        color:#F0F0FF;
      }
      .cl-nav-link.active { color:#9B59F5; }
      .cl-nav-icon { font-size:1rem; }
      .cl-nav-user { display:flex; align-items:center; gap:8px; flex-shrink:0; }
      .cl-avatar-sm {
        width:32px; height:32px; border-radius:50%;
        background:linear-gradient(135deg,#FF6B9D,#9B59F5);
        display:flex; align-items:center; justify-content:center;
        font-size:0.85rem; font-weight:800; color:white;
        flex-shrink:0;
      }
      .cl-user-info { display:flex; flex-direction:column; }
      .cl-user-name { font-size:0.8rem; font-weight:700; color:#F0F0FF; line-height:1.2; }
      .cl-user-college { font-size:0.68rem; color:#8888AA; line-height:1.2; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .cl-logout-btn {
        background:none; border:none; cursor:pointer; font-size:1rem; padding:4px 6px;
        border-radius:8px; transition:background 0.2s;
      }
      .cl-logout-btn:hover { background:rgba(255,107,157,0.15); }
      @media(max-width:768px) {
        .cl-nav { padding:0 10px; }
        .cl-nav-label { display:none; }
        .cl-user-info { display:none; }
        .cl-nav-link { padding:6px 8px; }
      }
    </style>
  `;
  document.body.insertAdjacentHTML('afterbegin', navHTML);
})();

function logout() {
  localStorage.clear();
  window.location.href = 'index.html';
}

function authGuard() {
  if (!localStorage.getItem('token')) window.location.href = 'index.html';
}

async function apiFetch(path, options={}) {
  const token = localStorage.getItem('token');
  const res = await fetch('http://localhost:5000/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...(options.headers || {})
    }
  });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}