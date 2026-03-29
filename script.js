// ===== PROTOTYPE DATA (OBFUSCATED) =====
// Note: In a production environment, authentication must be handled server-side.
const ADMIN_EMAIL_B64 = 'YWRtaW5AOXdhdmVzLmNvbQ=='; // admin@9waves.com
const ADMIN_PASS_B64  = 'YWRtaW4xMjM=';            // admin123
const ADMIN_KEY_B64   = 'd2F2ZXMyMDI1YWRtaW4=';    // waves2025admin

let users = JSON.parse(localStorage.getItem('9waves_users') || '[]');
let currentUser = JSON.parse(localStorage.getItem('9waves_current') || 'null');
let loginRole = 'customer';

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function saveUsers(){ localStorage.setItem('9waves_users', JSON.stringify(users)); }
function saveSession(u){ currentUser=u; localStorage.setItem('9waves_current', JSON.stringify(u)); }
function clearSession(){ currentUser=null; localStorage.removeItem('9waves_current'); }

// ===== TOAST =====
function showToast(msg, bg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = bg || 'var(--sage-dark)';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 4500);
}

// ===== AUTH MODAL =====
function openAuth(){ document.getElementById('authOverlay').classList.add('open'); document.body.style.overflow='hidden'; }
function closeAuth(){ document.getElementById('authOverlay').classList.remove('open'); document.body.style.overflow=''; }
document.getElementById('authClose').onclick = closeAuth;
document.getElementById('authOverlay').addEventListener('click', e=>{ if(e.target===document.getElementById('authOverlay')) closeAuth(); });

// TABS
document.querySelectorAll('.auth-tab').forEach(tab=>{
  tab.onclick = function(){
    document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.auth-panel').forEach(p=>p.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('panel-'+this.dataset.tab).classList.add('active');
    clearFormErrors();
  };
});
document.getElementById('goRegister').onclick = e=>{ e.preventDefault(); document.querySelectorAll('.auth-tab')[1].click(); };
document.getElementById('goLogin').onclick    = e=>{ e.preventDefault(); document.querySelectorAll('.auth-tab')[0].click(); };

// ROLE BUTTONS
document.querySelectorAll('.role-btn').forEach(btn=>{
  btn.onclick = function(){
    document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('active'));
    this.classList.add('active');
    loginRole = this.dataset.role;
    document.getElementById('adminKeyField').classList.toggle('show', loginRole==='admin');
  };
});

function clearFormErrors(){
  ['loginError','regError'].forEach(id=>{ const el=document.getElementById(id); el.style.display='none'; el.textContent=''; });
}
function showError(id, msg){ const el=document.getElementById(id); el.textContent=msg; el.style.display='block'; }

// ===== LOGIN =====
document.getElementById('loginBtn').onclick = function(){
  clearFormErrors();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;

  if(!email||!pass){ showError('loginError','Please fill in all fields.'); return; }

  if(loginRole==='admin'){
    const key = document.getElementById('adminKey').value;
    if(btoa(email)===ADMIN_EMAIL_B64 && btoa(pass)===ADMIN_PASS_B64 && btoa(key)===ADMIN_KEY_B64){
      saveSession({ name:'Administrator', email, role:'admin' });
      closeAuth();
      openAdminPanel();
      showToast('✦ Welcome back, Admin!');
    } else {
      showError('loginError','Invalid admin credentials or access key.');
    }
    return;
  }

  const user = users.find(u=>u.email===email && u.password===pass);
  if(user){
    saveSession({ name:user.firstName+' '+user.lastName, email:user.email, role:'customer', phone:user.phone });
    closeAuth();
    openCustomerPanel();
    showToast('✦ Welcome back, '+user.firstName+'!');
  } else {
    showError('loginError','No account found with these credentials. Please try again.');
  }
};

// ===== REGISTER =====
document.getElementById('registerBtn').onclick = function(){
  clearFormErrors();
  const first   = document.getElementById('regFirst').value.trim();
  const last    = document.getElementById('regLast').value.trim();
  const email   = document.getElementById('regEmail').value.trim();
  const phone   = document.getElementById('regPhone').value.trim();
  const pass    = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;

  if(!first||!last||!email||!pass){ showError('regError','Please fill in all required fields.'); return; }
  if(pass.length<6){ showError('regError','Password must be at least 6 characters.'); return; }
  if(pass!==confirm){ showError('regError','Passwords do not match.'); return; }
  if(users.find(u=>u.email===email)){ showError('regError','An account with this email already exists.'); return; }

  const newUser = {
    firstName:first, lastName:last, email, phone, password:pass,
    registered: new Date().toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'})
  };
  users.push(newUser);
  saveUsers();
  saveSession({ name:first+' '+last, email, role:'customer', phone });
  closeAuth();
  openCustomerPanel();
  showToast('✦ Account created! Welcome to 9 Waves, '+first+'!');
};

// ===== NAV =====
function updateNav(){
  const area = document.getElementById('navAuthArea');
  const mobileLink = document.getElementById('mobileAuthLink');
  if(!currentUser){
    area.innerHTML = `<button class="nav-cta" onclick="openAuth()">Sign In</button>`;
    mobileLink.textContent='Sign In';
    mobileLink.onclick=()=>{ openAuth(); closeMobile(); };
    return;
  }
  const initial = currentUser.name.charAt(0).toUpperCase();
  const panelFn = currentUser.role==='admin' ? 'openAdminPanel()' : 'openCustomerPanel()';
  const roleLabel = currentUser.role==='admin' ? '🔐 Administrator' : '👤 Customer';
  const dashLabel = currentUser.role==='admin' ? 'Admin Dashboard' : 'My Account';
  const safeName = escapeHTML(currentUser.name);
  const safeFirstName = escapeHTML(currentUser.name.split(' ')[0]);
  const safeInitial = escapeHTML(initial);

  area.innerHTML = `
    <div class="nav-user">
      <div class="nav-user-btn" id="dropBtn">
        <div class="nav-avatar">${safeInitial}</div>
        <span class="nav-user-name">${safeFirstName}</span>
        <span class="nav-chevron">▼</span>
      </div>
      <div class="user-dropdown" id="dropMenu">
        <div class="dropdown-header">
          <div class="dropdown-name">${safeName}</div>
          <div class="dropdown-role">${roleLabel}</div>
        </div>
        <button class="dropdown-item" onclick="${panelFn}"><span>🏠</span>${dashLabel}</button>
        <hr class="dropdown-divider">
        <button class="dropdown-item danger" onclick="signOut()"><span>🚪</span>Sign Out</button>
      </div>
    </div>`;

  mobileLink.textContent = dashLabel;
  mobileLink.onclick = ()=>{ currentUser.role==='admin'?openAdminPanel():openCustomerPanel(); closeMobile(); };

  setTimeout(()=>{
    const btn=document.getElementById('dropBtn');
    const menu=document.getElementById('dropMenu');
    if(!btn) return;
    btn.onclick=()=>{ btn.classList.toggle('open'); menu.classList.toggle('open'); };
    document.addEventListener('click', e=>{ if(!btn.contains(e.target)){ btn.classList.remove('open'); menu.classList.remove('open'); } }, {once:false});
  },60);
}

// ===== SIGN OUT =====
function signOut(){
  const name = currentUser ? currentUser.name.split(' ')[0] : '';
  clearSession();
  updateNav();
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('customerPanel').classList.remove('open');
  document.body.style.overflow='';
  showToast('✦ Goodbye, '+name+'! See you soon.', '#6b4f3a');
}

// ===== ADMIN PANEL =====
function openAdminPanel(){
  if(!currentUser||currentUser.role!=='admin') return;
  document.getElementById('adminGreet').textContent = currentUser.name.split(' ')[0];
  document.getElementById('adminDisplayName').textContent = currentUser.name;
  refreshAdminUsers();
  document.getElementById('adminPanel').classList.add('open');
  document.body.style.overflow='hidden';
  updateNav();
}

function refreshAdminUsers(){
  const tbody = document.getElementById('adminUsersBody');
  document.getElementById('statUsers').textContent = users.length;
  if(!users.length){
    tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:28px 18px;">No registered customers yet.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u=>`
    <tr>
      <td>${escapeHTML(u.firstName)} ${escapeHTML(u.lastName)}</td>
      <td>${escapeHTML(u.email)}</td>
      <td>${escapeHTML(u.phone||'—')}</td>
      <td>${escapeHTML(u.registered||'—')}</td>
    </tr>`).join('');
}

function changeStatus(btn, status){
  const row = btn.closest('tr');
  const badge = row.querySelector('.status-badge');
  badge.className = 'status-badge status-'+status;
  badge.textContent = status.charAt(0).toUpperCase()+status.slice(1);
  const td = btn.parentElement;
  if(status==='confirmed'){
    btn.textContent='Cancel'; btn.className='tbl-btn tbl-cancel';
    btn.onclick=function(){ changeStatus(this,'cancelled'); };
  } else {
    td.innerHTML='<span style="color:#ccc;font-size:13px;">—</span>';
  }
  // Update stats
  const all = document.querySelectorAll('#adminBookingsBody .status-badge');
  const pending = [...all].filter(b=>b.classList.contains('status-pending')).length;
  document.getElementById('statPending').textContent = pending;
}

// ===== CUSTOMER PANEL =====
function openCustomerPanel(){
  if(!currentUser||currentUser.role!=='customer') return;
  document.getElementById('customerGreet').textContent = currentUser.name.split(' ')[0];
  document.getElementById('customerDisplayName').textContent = currentUser.name;
  document.getElementById('customerProfileInfo').innerHTML = `
    <div class="profile-row"><span class="profile-label">Full Name</span><span class="profile-value">${escapeHTML(currentUser.name)}</span></div>
    <div class="profile-row"><span class="profile-label">Email</span><span class="profile-value">${escapeHTML(currentUser.email)}</span></div>
    <div class="profile-row"><span class="profile-label">Phone</span><span class="profile-value">${escapeHTML(currentUser.phone||'Not provided')}</span></div>
    <div class="profile-row"><span class="profile-label">Account Type</span><span class="profile-value">Customer</span></div>`;
  document.getElementById('customerPanel').classList.add('open');
  document.body.style.overflow='hidden';
  updateNav();
}

function closePanelGoTo(section){
  document.getElementById('adminPanel').classList.remove('open');
  document.getElementById('customerPanel').classList.remove('open');
  document.body.style.overflow='';
  setTimeout(()=>{ const el=document.getElementById(section); if(el) el.scrollIntoView({behavior:'smooth'}); },100);
}

// ===== NAV SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll',()=>navbar.classList.toggle('scrolled',window.scrollY>60));

// ===== HAMBURGER =====
document.getElementById('hamburger').onclick=()=>document.getElementById('mobileMenu').classList.add('open');
document.getElementById('mobileClose').onclick=()=>document.getElementById('mobileMenu').classList.remove('open');
function closeMobile(){ document.getElementById('mobileMenu').classList.remove('open'); }

// ===== REVEAL =====
const observer = new IntersectionObserver(entries=>{
  entries.forEach(el=>{ if(el.isIntersecting) el.target.classList.add('visible'); });
},{threshold:0.1});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// ===== PETALS =====
const pc=document.getElementById('petals');
['rgba(201,168,76,0.6)','rgba(255,255,255,0.4)','rgba(168,184,154,0.5)','rgba(201,168,76,0.3)'].forEach((c,i)=>{
  for(let j=0;j<3;j++){
    const p=document.createElement('div'); p.className='petal';
    p.style.cssText=`left:${Math.random()*100}%;background:${c};animation-duration:${6+Math.random()*8}s;animation-delay:${Math.random()*6}s;transform:rotate(${Math.random()*360}deg);`;
    pc.appendChild(p);
  }
});

// ===== GALLERY DRAG =====
const strip=document.getElementById('galleryStrip');
let down=false,sx,sl;
strip.addEventListener('mousedown',e=>{down=true;sx=e.pageX-strip.offsetLeft;sl=strip.scrollLeft;});
strip.addEventListener('mouseleave',()=>down=false);
strip.addEventListener('mouseup',()=>down=false);
strip.addEventListener('mousemove',e=>{ if(!down) return; e.preventDefault(); strip.scrollLeft=sl-(e.pageX-strip.offsetLeft-sx)*1.5; });

// ===== INQUIRY FORM =====
document.getElementById('inquiryForm').addEventListener('submit',function(e){
  e.preventDefault();
  showToast('✦ Inquiry sent! We\'ll be in touch within 24 hours.');
  this.reset();
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.onclick=function(e){
    const t=document.querySelector(this.getAttribute('href'));
    if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); }
  };
});

// ===== INIT =====
updateNav();
