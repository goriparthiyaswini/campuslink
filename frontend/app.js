// CampusLink - Main App JavaScript
const API = 'http://localhost:5000/api';
let socket;
let currentUser = null;
let currentChatUser = null;
let currentRoomId = null;
let chatbotMessages = [];
let onlineUsers = [];

// ─── API Helper ───────────────────────────────────────────────
async function api(method, endpoint, body = null, raw = false) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  const token = localStorage.getItem('cl_token');
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  if (raw) return res;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ─── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── Avatar Initials ──────────────────────────────────────────
function avatarInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?';
}

function timeAgo(date) {
  const d = new Date(date), now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Auth ─────────────────────────────────────────────────────
async function checkAuth() {
  const token = localStorage.getItem('cl_token');
  if (!token) { showAuthPage(); return; }
  try {
    currentUser = await api('GET', '/auth/me');
    initApp();
  } catch {
    localStorage.removeItem('cl_token');
    showAuthPage();
  }
}

function showAuthPage() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-section').style.display = 'flex';
  showLoginForm();
}

function showLoginForm() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

function showRegisterForm() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Signing in…';
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
    const { token, user } = await api('POST', '/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    localStorage.setItem('cl_token', token);
    currentUser = user;
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = 'Sign In';
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating account…';
  const errEl = document.getElementById('register-error');
  errEl.style.display = 'none';
  try {
    const skills = document.getElementById('reg-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const interests = document.getElementById('reg-interests').value.split(',').map(s => s.trim()).filter(Boolean);
    const { token, user } = await api('POST', '/auth/register', {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
      college: document.getElementById('reg-college').value,
      year: document.getElementById('reg-year').value,
      branch: document.getElementById('reg-branch').value,
      skills, interests
    });
    localStorage.setItem('cl_token', token);
    currentUser = user;
    initApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = 'Create Account';
}

function logout() {
  localStorage.removeItem('cl_token');
  currentUser = null;
  if (socket) socket.disconnect();
  location.reload();
}

// ─── App Init ─────────────────────────────────────────────────
function initApp() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Sidebar user info
  document.getElementById('sb-name').textContent = currentUser.name;
  document.getElementById('sb-college').textContent = currentUser.college;
  document.getElementById('sb-avatar').textContent = avatarInitials(currentUser.name);

  // Admin nav
  if (currentUser.role === 'admin') {
    document.getElementById('admin-nav').style.display = 'flex';
  }

  // Socket.IO
  socket = io('http://localhost:5000', { auth: { token: localStorage.getItem('cl_token') } });
  socket.emit('user_online', currentUser._id);

  socket.on('online_users', (users) => { onlineUsers = users; });

  socket.on('receive_message', (data) => {
    if (data.roomId === currentRoomId) {
      appendMessage(data, false);
    }
    fetchNotifCount();
  });

  socket.on('user_typing', (data) => {
    if (data.roomId === currentRoomId) {
      document.getElementById('typing-indicator').textContent = `${data.name} is typing…`;
    }
  });

  socket.on('user_stop_typing', (data) => {
    if (data.roomId === currentRoomId) {
      document.getElementById('typing-indicator').textContent = '';
    }
  });

  socket.on('new_notification', () => {
    fetchNotifCount();
    toast('You have a new notification 🔔', 'success');
  });

  // Load default page
  navigateTo('feed');
  fetchNotifCount();
}

// ─── Navigation ───────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.getElementById(`nav-${page}`)?.classList.add('active');
  document.getElementById('topbar-title').textContent = {
    feed: '🏠 Feed', discover: '🔍 Discover', chat: '💬 Chat',
    discussions: '📚 Discussions', notifications: '🔔 Notifications',
    profile: '👤 My Profile', admin: '⚙️ Admin', leaderboard: '🏆 Leaderboard'
  }[page] || 'CampusLink';

  if (page === 'feed') loadFeed();
  if (page === 'discover') loadUsers();
  if (page === 'chat') loadChats();
  if (page === 'discussions') loadDiscussions();
  if (page === 'notifications') loadNotifications();
  if (page === 'profile') loadProfile();
  if (page === 'leaderboard') loadLeaderboard();
  if (page === 'admin') loadAdmin();
}

// ─── FEED ─────────────────────────────────────────────────────
async function loadFeed() {
  const container = document.getElementById('posts-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const posts = await api('GET', '/posts');
    container.innerHTML = '';
    if (!posts.length) {
      container.innerHTML = '<div class="loading">No posts yet. Be the first to post! 🚀</div>';
      return;
    }
    posts.forEach(post => container.appendChild(renderPost(post)));
    loadSuggestedUsers();
  } catch (err) {
    container.innerHTML = `<div class="loading text-muted">${err.message}</div>`;
  }
}

function renderPost(post) {
  const div = document.createElement('div');
  div.className = 'post-card';
  const liked = post.likes.includes(currentUser._id);
  const typeColors = { post: '', question: 'question', project: 'project', event: 'event' };
  div.innerHTML = `
    <div class="post-header">
      <div class="avatar">${avatarInitials(post.author?.name)}</div>
      <div class="post-meta">
        <div class="name">${post.author?.name || 'Unknown'}</div>
        <div class="sub">${post.author?.college || ''} · ${timeAgo(post.createdAt)}</div>
      </div>
      <span class="post-type-badge ${typeColors[post.type]}">${post.type}</span>
    </div>
    <div class="post-content">${escHtml(post.content)}</div>
    ${post.tags?.length ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
    <div class="post-actions">
      <button class="post-action-btn ${liked ? 'liked' : ''}" onclick="toggleLike('${post._id}', this)">
        ${liked ? '❤️' : '🤍'} <span class="like-count">${post.likes.length}</span>
      </button>
      <button class="post-action-btn" onclick="toggleComments('${post._id}')">
        💬 <span>${post.comments.length}</span>
      </button>
      ${post.author?._id !== currentUser._id ? `<button class="post-action-btn" onclick="openChatWithUser('${post.author?._id}', '${esc(post.author?.name)}')">✉️ Message</button>` : ''}
      ${post.author?._id === currentUser._id ? `<button class="post-action-btn" onclick="deletePost('${post._id}', this)" style="color:var(--red)">🗑️</button>` : ''}
    </div>
    <div class="comments-section" id="comments-${post._id}">
      <div class="comments-list">
        ${post.comments.map(c => `
          <div class="comment-item">
            <div class="avatar" style="width:28px;height:28px;font-size:0.7rem">${avatarInitials(c.author?.name)}</div>
            <div class="comment-body">
              <div class="cn">${c.author?.name || 'Unknown'} <span style="color:var(--muted);font-weight:400;font-size:0.78rem">· ${c.author?.college || ''}</span></div>
              <div class="ct">${escHtml(c.content)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="comment-input-row mt-4">
        <textarea class="comment-input" placeholder="Write a comment…" rows="1" id="ci-${post._id}"></textarea>
        <button class="btn btn-primary btn-sm" style="width:auto" onclick="submitComment('${post._id}')">Post</button>
      </div>
    </div>
  `;
  return div;
}

function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  section.style.display = section.style.display === 'block' ? 'none' : 'block';
}

async function toggleLike(postId, btn) {
  try {
    const data = await api('POST', `/posts/${postId}/like`);
    btn.querySelector('.like-count').textContent = data.likes;
    btn.classList.toggle('liked', data.liked);
    btn.firstChild.textContent = data.liked ? '❤️' : '🤍';
  } catch (err) { toast(err.message, 'error'); }
}

async function submitComment(postId) {
  const input = document.getElementById(`ci-${postId}`);
  const content = input.value.trim();
  if (!content) return;
  try {
    const comment = await api('POST', `/posts/${postId}/comment`, { content });
    const list = document.querySelector(`#comments-${postId} .comments-list`);
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
      <div class="avatar" style="width:28px;height:28px;font-size:0.7rem">${avatarInitials(currentUser.name)}</div>
      <div class="comment-body">
        <div class="cn">${currentUser.name}</div>
        <div class="ct">${escHtml(content)}</div>
      </div>
    `;
    list.appendChild(div);
    input.value = '';
  } catch (err) { toast(err.message, 'error'); }
}

async function deletePost(postId, btn) {
  if (!confirm('Delete this post?')) return;
  try {
    await api('DELETE', `/posts/${postId}`);
    btn.closest('.post-card').remove();
    toast('Post deleted');
  } catch (err) { toast(err.message, 'error'); }
}

async function submitPost() {
  const content = document.getElementById('post-content').value.trim();
  const type = document.getElementById('post-type').value;
  const tags = document.getElementById('post-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  if (!content) { toast('Please write something!', 'error'); return; }
  const btn = document.getElementById('post-btn');
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    const post = await api('POST', '/posts', { content, type, tags });
    post.author = currentUser;
    post.comments = [];
    const container = document.getElementById('posts-container');
    container.insertBefore(renderPost(post), container.firstChild);
    document.getElementById('post-content').value = '';
    document.getElementById('post-tags').value = '';
    toast('Post shared! +5 points 🎉');
  } catch (err) { toast(err.message, 'error'); }
  btn.disabled = false; btn.textContent = '🚀 Post';
}

async function loadSuggestedUsers() {
  try {
    const users = await api('GET', '/users?limit=5');
    const list = document.getElementById('suggested-users');
    list.innerHTML = users.slice(0, 5).map(u => `
      <div class="widget-user-item">
        <div class="avatar" style="width:34px;height:34px;font-size:0.8rem">${avatarInitials(u.name)}</div>
        <div class="widget-user-info">
          <div class="name">${u.name}</div>
          <div class="college">${u.college}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="connectUser('${u._id}')">+</button>
      </div>
    `).join('');
  } catch {}
}

// ─── DISCOVER ─────────────────────────────────────────────────
async function loadUsers() {
  const container = document.getElementById('users-grid');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const college = document.getElementById('filter-college')?.value || '';
  const skill = document.getElementById('filter-skill')?.value || '';
  const search = document.getElementById('filter-search')?.value || '';
  try {
    const params = new URLSearchParams();
    if (college) params.set('college', college);
    if (skill) params.set('skill', skill);
    if (search) params.set('search', search);
    const users = await api('GET', `/users?${params}`);
    container.innerHTML = '';
    if (!users.length) { container.innerHTML = '<div class="loading">No students found</div>'; return; }
    users.forEach(u => {
      const isConnected = u.connections?.includes(currentUser._id);
      const isPending = u.connectionRequests?.includes(currentUser._id);
      const card = document.createElement('div');
      card.className = 'user-card';
      card.innerHTML = `
        <div class="avatar lg" style="margin:0 auto 12px">${avatarInitials(u.name)}</div>
        <div class="name">${u.name}</div>
        <div class="college">${u.college}</div>
        <div class="branch">${u.branch || ''} ${u.year ? '· Year ' + u.year : ''}</div>
        ${u.skills?.length ? `<div class="skills-list">${u.skills.slice(0,4).map(s => `<span class="skill-chip">${s}</span>`).join('')}</div>` : ''}
        <div class="user-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="openChatWithUser('${u._id}', '${esc(u.name)}')">💬 Chat</button>
          ${isConnected ? '<button class="btn btn-ghost btn-sm" disabled>✅ Connected</button>'
            : isPending ? '<button class="btn btn-ghost btn-sm" disabled>⏳ Sent</button>'
            : `<button class="btn btn-primary btn-sm" onclick="connectUser('${u._id}')">+ Connect</button>`}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (err) { container.innerHTML = `<div class="loading">${err.message}</div>`; }
}

async function connectUser(userId) {
  try {
    await api('POST', `/users/${userId}/connect`);
    toast('Connection request sent! 🤝');
    loadUsers();
  } catch (err) { toast(err.message, 'error'); }
}

// ─── CHAT ─────────────────────────────────────────────────────
async function loadChats() {
  const container = document.getElementById('chat-contacts');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const users = await api('GET', '/users');
    const connections = users.filter(u =>
      currentUser.connections?.some(c => c === u._id || c?._id === u._id)
    );
    const display = connections.length ? connections : users.slice(0, 10);
    container.innerHTML = '';
    display.forEach(u => {
      const div = document.createElement('div');
      div.className = 'chat-contact';
      div.id = `contact-${u._id}`;
      div.innerHTML = `
        <div class="avatar" style="position:relative">
          ${avatarInitials(u.name)}
          ${onlineUsers.includes(u._id) ? '<div class="online-dot"></div>' : ''}
        </div>
        <div class="chat-contact-info">
          <div class="chat-contact-name">${u.name}</div>
          <div class="chat-contact-preview">${u.college}</div>
        </div>
      `;
      div.onclick = () => openChat(u);
      container.appendChild(div);
    });
  } catch (err) { container.innerHTML = `<div class="loading">${err.message}</div>`; }
}

async function openChat(user) {
  currentChatUser = user;
  document.querySelectorAll('.chat-contact').forEach(c => c.classList.remove('active'));
  document.getElementById(`contact-${user._id}`)?.classList.add('active');
  document.getElementById('chat-header-name').textContent = user.name;
  document.getElementById('chat-header-college').textContent = user.college;
  document.getElementById('chat-header-avatar').textContent = avatarInitials(user.name);
  document.getElementById('chat-placeholder').style.display = 'none';
  document.getElementById('chat-active').style.display = 'flex';

  const data = await api('GET', `/chat/${user._id}`);
  currentRoomId = data.roomId;
  socket.emit('join_room', currentRoomId);

  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML = '';
  data.messages.forEach(m => appendMessage({
    senderId: m.sender._id || m.sender,
    senderName: m.sender.name,
    message: m.content,
    timestamp: m.timestamp
  }, false));
  msgs.scrollTop = msgs.scrollHeight;
}

function openChatWithUser(userId, name) {
  navigateTo('chat');
  setTimeout(async () => {
    try {
      const user = await api('GET', `/users/${userId}`);
      openChat(user);
    } catch {}
  }, 300);
}

function appendMessage(data, scroll = true) {
  const msgs = document.getElementById('chat-messages');
  const isMe = data.senderId === currentUser._id;
  const div = document.createElement('div');
  div.className = `msg${isMe ? ' mine' : ''}`;
  div.innerHTML = `
    ${!isMe ? `<div class="avatar" style="width:30px;height:30px;font-size:0.7rem">${avatarInitials(data.senderName)}</div>` : ''}
    <div>
      <div class="msg-bubble">${escHtml(data.message)}</div>
      <div class="msg-time">${new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `;
  msgs.appendChild(div);
  if (scroll) msgs.scrollTop = msgs.scrollHeight;
}

let typingTimeout;
function handleChatInput(e) {
  if (!currentRoomId) return;
  socket.emit('typing', { roomId: currentRoomId, name: currentUser.name });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', { roomId: currentRoomId });
  }, 1500);
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg || !currentRoomId) return;
  socket.emit('send_message', {
    roomId: currentRoomId,
    message: msg,
    senderId: currentUser._id,
    senderName: currentUser.name,
    senderCollege: currentUser.college
  });
  appendMessage({ senderId: currentUser._id, senderName: currentUser.name, message: msg, timestamp: new Date() });
  input.value = '';
  socket.emit('stop_typing', { roomId: currentRoomId });
}

// ─── DISCUSSIONS ──────────────────────────────────────────────
let currentDiscCategory = 'All';

async function loadDiscussions() {
  const container = document.getElementById('disc-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const search = document.getElementById('disc-search')?.value || '';
  try {
    const params = new URLSearchParams();
    if (currentDiscCategory !== 'All') params.set('category', currentDiscCategory);
    if (search) params.set('search', search);
    const discs = await api('GET', `/discussions?${params}`);
    container.innerHTML = '';
    if (!discs.length) { container.innerHTML = '<div class="loading">No discussions yet</div>'; return; }
    discs.forEach(d => {
      const card = document.createElement('div');
      card.className = `disc-card${d.isSolved ? ' solved' : ''}`;
      card.innerHTML = `
        <div class="disc-title">
          ${escHtml(d.title)}
          ${d.isSolved ? '<span class="solved-badge">✅ Solved</span>' : ''}
        </div>
        <div style="font-size:0.88rem;color:var(--muted);margin-bottom:8px">${escHtml(d.content.substring(0, 120))}${d.content.length > 120 ? '…' : ''}</div>
        ${d.tags?.length ? `<div class="post-tags">${d.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
        <div class="disc-meta">
          <span>👤 ${d.author?.name}</span>
          <span>🏫 ${d.author?.college}</span>
          <span>💬 ${d.replies?.length || 0} replies</span>
          <span>👁️ ${d.views} views</span>
          <span>📂 ${d.category}</span>
          <span>🕐 ${timeAgo(d.createdAt)}</span>
        </div>
      `;
      card.onclick = () => openDiscussion(d._id);
      container.appendChild(card);
    });
  } catch (err) { container.innerHTML = `<div class="loading">${err.message}</div>`; }
}

function setDiscCategory(cat, btn) {
  currentDiscCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadDiscussions();
}

async function openDiscussion(id) {
  const detail = document.getElementById('disc-detail-view');
  const list = document.getElementById('disc-list-view');
  list.style.display = 'none';
  detail.style.display = 'block';
  detail.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const d = await api('GET', `/discussions/${id}`);
    detail.innerHTML = `
      <div class="disc-detail">
        <div class="disc-back" onclick="closeDiscussion()">← Back to Discussions</div>
        <div class="card mb-4">
          <h2 style="font-size:1.4rem;margin-bottom:10px">${escHtml(d.title)} ${d.isSolved ? '<span class="solved-badge">✅ Solved</span>' : ''}</h2>
          <div class="flex items-center gap-3 mb-4">
            <div class="avatar">${avatarInitials(d.author?.name)}</div>
            <div>
              <div style="font-weight:600">${d.author?.name}</div>
              <div style="font-size:0.8rem;color:var(--muted)">${d.author?.college} · ${timeAgo(d.createdAt)} · 📂 ${d.category}</div>
            </div>
            ${d.author?._id === currentUser._id ? `<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="markSolved('${d._id}', this)">${d.isSolved ? 'Unmark Solved' : '✅ Mark Solved'}</button>` : ''}
          </div>
          <div class="disc-body">${escHtml(d.content)}</div>
          ${d.tags?.length ? `<div class="post-tags">${d.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
        </div>

        <h3 style="margin-bottom:14px">💬 ${d.replies.length} Replies</h3>
        <div id="replies-container">
          ${d.replies.map(r => `
            <div class="reply-card">
              <div class="reply-header">
                <div class="avatar" style="width:32px;height:32px;font-size:0.8rem">${avatarInitials(r.author?.name)}</div>
                <div>
                  <div style="font-weight:600;font-size:0.9rem">${r.author?.name}</div>
                  <div style="font-size:0.78rem;color:var(--muted)">${r.author?.college} · ${timeAgo(r.createdAt)}</div>
                </div>
              </div>
              <div style="font-size:0.9rem;line-height:1.7">${escHtml(r.content)}</div>
            </div>
          `).join('')}
        </div>

        <div class="card mt-4">
          <h4 style="margin-bottom:12px">Post a Reply</h4>
          <textarea class="form-group" id="reply-input" placeholder="Share your knowledge…" style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);font-family:inherit;font-size:0.9rem;min-height:100px;outline:none;resize:vertical"></textarea>
          <button class="btn btn-primary mt-4" style="width:auto" onclick="submitReply('${d._id}')">Post Reply</button>
        </div>
      </div>
    `;
  } catch (err) {
    detail.innerHTML = `<div class="loading">${err.message}</div>`;
  }
}

function closeDiscussion() {
  document.getElementById('disc-detail-view').style.display = 'none';
  document.getElementById('disc-list-view').style.display = 'block';
}

async function submitReply(discId) {
  const content = document.getElementById('reply-input').value.trim();
  if (!content) return;
  try {
    const reply = await api('POST', `/discussions/${discId}/reply`, { content });
    const container = document.getElementById('replies-container');
    const div = document.createElement('div');
    div.className = 'reply-card';
    div.innerHTML = `
      <div class="reply-header">
        <div class="avatar" style="width:32px;height:32px;font-size:0.8rem">${avatarInitials(currentUser.name)}</div>
        <div>
          <div style="font-weight:600;font-size:0.9rem">${currentUser.name}</div>
          <div style="font-size:0.78rem;color:var(--muted)">${currentUser.college} · just now</div>
        </div>
      </div>
      <div style="font-size:0.9rem;line-height:1.7">${escHtml(content)}</div>
    `;
    container.appendChild(div);
    document.getElementById('reply-input').value = '';
    toast('Reply posted! +5 points 🎉');
  } catch (err) { toast(err.message, 'error'); }
}

async function markSolved(discId, btn) {
  try {
    const data = await api('PATCH', `/discussions/${discId}/solve`);
    btn.textContent = data.isSolved ? 'Unmark Solved' : '✅ Mark Solved';
    toast(data.isSolved ? 'Marked as solved!' : 'Unmarked');
  } catch (err) { toast(err.message, 'error'); }
}

async function createDiscussion() {
  const title = document.getElementById('disc-title').value.trim();
  const content = document.getElementById('disc-content').value.trim();
  const category = document.getElementById('disc-category').value;
  const tags = document.getElementById('disc-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  if (!title || !content) { toast('Title and content are required', 'error'); return; }
  try {
    await api('POST', '/discussions', { title, content, category, tags });
    closeModal('create-disc-modal');
    document.getElementById('disc-title').value = '';
    document.getElementById('disc-content').value = '';
    document.getElementById('disc-tags').value = '';
    toast('Discussion created! +10 points 🚀');
    loadDiscussions();
  } catch (err) { toast(err.message, 'error'); }
}

// ─── NOTIFICATIONS ────────────────────────────────────────────
async function loadNotifications() {
  const container = document.getElementById('notif-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const notifs = await api('GET', '/notifications');
    await api('PATCH', '/notifications/read');
    document.getElementById('notif-badge').textContent = '';
    document.getElementById('notif-badge').style.display = 'none';
    container.innerHTML = '';
    if (!notifs.length) { container.innerHTML = '<div class="loading">No notifications yet</div>'; return; }
    const icons = { like: '❤️', comment: '💬', connection: '🤝', message: '✉️', reply: '💬' };
    notifs.forEach(n => {
      const div = document.createElement('div');
      div.className = `notif-item${n.read ? ' read' : ''}`;
      div.innerHTML = `
        <div class="notif-icon">${icons[n.type] || '🔔'}</div>
        <div class="notif-body">
          <p>${n.message}</p>
          <time>${timeAgo(n.createdAt)}</time>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (err) { container.innerHTML = `<div class="loading">${err.message}</div>`; }
}

async function fetchNotifCount() {
  try {
    const data = await api('GET', '/notifications/unread-count');
    const badge = document.getElementById('notif-badge');
    if (data.count > 0) {
      badge.textContent = data.count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}

// ─── PROFILE ──────────────────────────────────────────────────
async function loadProfile() {
  const container = document.getElementById('profile-container');
  try {
    const user = await api('GET', `/users/${currentUser._id}`);
    const rankColors = ['gold', 'silver', 'bronze'];
    container.innerHTML = `
      <div class="profile-header">
        <div class="profile-top">
          <div class="avatar xl">${avatarInitials(user.name)}</div>
          <div class="profile-info">
            <h2>${user.name}</h2>
            <div class="college">🏫 ${user.college}</div>
            ${user.branch ? `<div style="font-size:0.85rem;color:var(--muted)">${user.branch}${user.year ? ' · Year ' + user.year : ''}</div>` : ''}
            ${user.bio ? `<div class="bio mt-4">${escHtml(user.bio)}</div>` : ''}
          </div>
          <button class="btn btn-ghost btn-sm" onclick="openModal('edit-profile-modal')">✏️ Edit</button>
        </div>
        <div class="profile-stats">
          <div class="stat"><div class="num">${user.connections?.length || 0}</div><div class="lbl">Connections</div></div>
          <div class="stat"><div class="num">${user.points || 0}</div><div class="lbl">Points</div></div>
        </div>
      </div>

      ${user.skills?.length ? `
        <div class="card mb-4">
          <div class="section-title">🛠️ Skills</div>
          <div class="chips-display">${user.skills.map(s => `<span class="skill-chip">${s}</span>`).join('')}</div>
        </div>
      ` : ''}

      ${user.interests?.length ? `
        <div class="card mb-4">
          <div class="section-title">💡 Interests</div>
          <div class="chips-display">${user.interests.map(i => `<span class="interest-chip">${i}</span>`).join('')}</div>
        </div>
      ` : ''}

      ${user.connections?.length ? `
        <div class="card mb-4">
          <div class="section-title">🤝 Connections (${user.connections.length})</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${user.connections.slice(0,8).map(c => `
              <div style="text-align:center">
                <div class="avatar" style="margin:0 auto 5px">${avatarInitials(c.name)}</div>
                <div style="font-size:0.75rem">${c.name}</div>
                <div style="font-size:0.7rem;color:var(--muted)">${c.college}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Pre-fill edit form
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-college').value = user.college;
    document.getElementById('edit-year').value = user.year || '';
    document.getElementById('edit-branch').value = user.branch || '';
    document.getElementById('edit-skills').value = user.skills?.join(', ') || '';
    document.getElementById('edit-interests').value = user.interests?.join(', ') || '';
  } catch (err) { container.innerHTML = `<div class="loading">${err.message}</div>`; }
}

async function saveProfile() {
  try {
    const skills = document.getElementById('edit-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const interests = document.getElementById('edit-interests').value.split(',').map(s => s.trim()).filter(Boolean);
    const user = await api('PUT', '/users/profile', {
      name: document.getElementById('edit-name').value,
      bio: document.getElementById('edit-bio').value,
      college: document.getElementById('edit-college').value,
      year: document.getElementById('edit-year').value,
      branch: document.getElementById('edit-branch').value,
      skills, interests
    });
    currentUser = { ...currentUser, ...user };
    closeModal('edit-profile-modal');
    toast('Profile updated! ✅');
    loadProfile();
  } catch (err) { toast(err.message, 'error'); }
}

// ─── LEADERBOARD ──────────────────────────────────────────────
async function loadLeaderboard() {
  const container = document.getElementById('lb-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const users = await api('GET', '/users/leaderboard/top');
    const rankLabels = ['🥇', '🥈', '🥉'];
    const rankClass = ['gold', 'silver', 'bronze'];
    container.innerHTML = users.map((u, i) => `
      <div class="lb-item">
        <div class="lb-rank ${rankClass[i] || ''}">${rankLabels[i] || i + 1}</div>
        <div class="avatar">${avatarInitials(u.name)}</div>
        <div class="lb-info">
          <div class="name">${u.name}</div>
          <div class="college">${u.college}</div>
        </div>
        <div class="lb-points">${u.points} pts</div>
      </div>
    `).join('');
  } catch (err) { container.innerHTML = `<div class="loading">${err.message}</div>`; }
}

// ─── ADMIN ────────────────────────────────────────────────────
async function loadAdmin() {
  if (currentUser.role !== 'admin') return;
  try {
    const [users, posts, discs] = await Promise.all([
      api('GET', '/users'),
      api('GET', '/posts'),
      api('GET', '/discussions')
    ]);
    document.getElementById('admin-user-count').textContent = users.length;
    document.getElementById('admin-post-count').textContent = posts.length;
    document.getElementById('admin-disc-count').textContent = discs.length;

    const userTable = document.getElementById('admin-users-table');
    userTable.innerHTML = users.slice(0, 20).map(u => `
      <tr>
        <td style="padding:10px">${u.name}</td>
        <td style="padding:10px;color:var(--muted)">${u.email}</td>
        <td style="padding:10px">${u.college}</td>
        <td style="padding:10px">${u.role}</td>
        <td style="padding:10px">${u.points}</td>
      </tr>
    `).join('');
  } catch (err) { toast(err.message, 'error'); }
}

// ─── CHATBOT ──────────────────────────────────────────────────
function toggleChatbot() {
  const win = document.getElementById('chatbot-window');
  win.classList.toggle('open');
  if (win.classList.contains('open') && chatbotMessages.length === 0) {
    appendBotMsg("👋 Hi! I'm **CampusBot**, your AI assistant for CampusLink!\n\nI can help you navigate the platform, answer academic queries, find collaborators, and more. What can I help you with?");
  }
}

function appendBotMsg(text) {
  const msgs = document.getElementById('chatbot-msgs');
  const div = document.createElement('div');
  div.className = 'bot-msg';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendUserMsg(text) {
  const msgs = document.getElementById('chatbot-msgs');
  const div = document.createElement('div');
  div.className = 'user-msg';
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendChatbotMsg() {
  const input = document.getElementById('chatbot-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendUserMsg(text);
  chatbotMessages.push({ role: 'user', content: text });

  const msgs = document.getElementById('chatbot-msgs');
  const typing = document.createElement('div');
  typing.className = 'bot-msg bot-typing';
  typing.textContent = '⏳ Thinking…';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const data = await api('POST', '/chatbot', { messages: chatbotMessages });
    typing.remove();
    appendBotMsg(data.reply);
    chatbotMessages.push({ role: 'assistant', content: data.reply });
  } catch (err) {
    typing.remove();
    appendBotMsg('Sorry, I encountered an error. Please try again.');
  }
}

function chatbotKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatbotMsg(); }
}

// ─── MODALS ───────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ─── UTILS ────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
}
function esc(str) { return String(str || '').replace(/'/g, "\\'"); }

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', checkAuth);