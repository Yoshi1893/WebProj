// ===== PROTOTYPE DATA (OBFUSCATED) =====
// Note: In a production environment, authentication must be handled server-side.
const ADMIN_EMAIL_B64 = 'YWRtaW5AOXdhdmVzLmNvbQ=='; // admin@9waves.com
const ADMIN_PASS_B64  = 'YWRtaW4xMjM=';            // admin123

let users = JSON.parse(localStorage.getItem('9waves_users') || '[]');
let currentUser = JSON.parse(localStorage.getItem('9waves_current') || 'null');
let bookings  = JSON.parse(localStorage.getItem('9waves_bookings') || '[]');

// Seed initial bookings if empty
if (bookings.length === 0) {
  bookings = [
    { id: 1, client: 'Andrea Santos', event: 'Wedding', venue: 'Pearl Ballroom', date: '2025-04-12', status: 'pending' },
    { id: 2, client: 'Lorraine Dela Cruz', event: 'Debut', venue: 'Wavecrest Garden', date: '2025-05-03', status: 'confirmed' },
    { id: 3, client: 'Raphael Tan', event: 'Corporate Gala', venue: 'Pearl Ballroom', date: '2025-06-20', status: 'pending' },
    { id: 4, client: 'Elena Rodriguez', event: 'Wedding', venue: 'Wavecrest Garden', date: '2025-05-15', status: 'confirmed' },
    { id: 5, client: 'Marcus Wong', event: 'Corporate Event', venue: 'Tidal Pool Terrace', date: '2025-07-10', status: 'pending' }
  ];
  localStorage.setItem('9waves_bookings', JSON.stringify(bookings));
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function saveUsers(){ localStorage.setItem('9waves_users', JSON.stringify(users)); }
function saveSession(u){ currentUser=u; localStorage.setItem('9waves_current', JSON.stringify(u)); }
function clearSession(){ currentUser=null; localStorage.removeItem('9waves_current'); }
function saveBookings(){ 
  localStorage.setItem('9waves_bookings', JSON.stringify(bookings)); 
  updateAvailabilityCalendar();
}

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

  // Check Admin First
  if(btoa(email)===ADMIN_EMAIL_B64 && btoa(pass)===ADMIN_PASS_B64){
    saveSession({ name:'Administrator', email, role:'admin' });
    closeAuth();
    openAdminPanel();
    showToast('✦ Welcome back, Admin!');
    return;
  }

  // Check Customers
  const user = users.find(u=>u.email===email && u.password===pass);
  if(user){
    saveSession({ name:user.firstName+' '+user.lastName, email:user.email, role:'customer', phone:user.phone });
    closeAuth();
    openCustomerPanel();
    showToast('✦ Welcome back, '+user.firstName+'!');
  } else {
    showError('loginError','Invalid credentials. Please try again.');
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
  refreshAdminBookings();
  initAdminCharts();
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

function refreshAdminBookings(){
  const tbody = document.getElementById('adminBookingsBody');
  const statBookings = document.getElementById('statBookings');
  const statPending = document.getElementById('statPending');
  
  statBookings.textContent = bookings.length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  statPending.textContent = pendingCount;

  if(!bookings.length){
    tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:28px 18px;">No bookings found.</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const statusClass = `status-${b.status}`;
    const statusLabel = b.status.charAt(0).toUpperCase() + b.status.slice(1);
    
    const actionBtn = b.status === 'pending' 
      ? `<button class="tbl-btn tbl-confirm" onclick="changeBookingStatus(${b.id}, 'confirmed')">Confirm</button>`
      : b.status === 'confirmed' 
        ? `<button class="tbl-btn tbl-cancel" onclick="changeBookingStatus(${b.id}, 'cancelled')">Cancel</button>`
        : `<span style="color:#ccc;font-size:13px;">—</span>`;

    const extrasHtml = b.extras && b.extras.length 
      ? b.extras.map(ex => `<span class="extra-badge">${ex}</span>`).join('') 
      : '<span style="color:#ccc;font-size:11px;">No extras</span>';

    return `
      <tr>
        <td>${escapeHTML(b.client)}</td>
        <td>
          <div style="font-weight:600; font-size:14px; color:var(--dark);">${escapeHTML(b.event)}</div>
          <div style="margin-top:5px;">${extrasHtml}</div>
        </td>
        <td>${escapeHTML(b.venue)}</td>
        <td>${new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td><span class="status-badge status-${b.status}">${statusLabel}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

async function changeBookingStatus(id, status){
  const booking = bookings.find(b => b.id === id);
  if (booking) {
    if (status === 'cancelled') {
      const confirmed = await showConfirmModal(
        'Confirm Cancellation', 
        `Are you sure you want to cancel the booking for ${booking.client}? This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    booking.status = status;
    saveBookings();
    refreshAdminBookings();
    initAdminCharts(); // Refresh charts
    showToast(`✦ Booking for ${booking.client} ${status}!`);
  }
}

function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent = message;
    
    overlay.classList.add('open');

    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    const onYes = () => {
      overlay.classList.remove('open');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(true);
    };

    const onNo = () => {
      overlay.classList.remove('open');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      resolve(false);
    };

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}

// ===== IMMERSIVE EXPLORER =====
const EXPLORER_DATA = {
  ballroom: {
    title: 'The Pearl Ballroom',
    desc: 'A masterpiece of gold and light, featuring crystal chandeliers and floor-to-ceiling views of the lagoon.',
    cap: '500 Guests',
    aes: 'Grand Luxury'
  },
  garden: {
    title: 'Wavecrest Garden',
    desc: 'Lush manicured greenery and stone pathways under a white wedding gazebo, perfect for golden hour celebrations.',
    cap: '300 Guests',
    aes: 'Natural Elegance'
  }
};

function switchExplorerView(view) {
  const data = EXPLORER_DATA[view];
  if (!data) return;

  // Update tabs
  document.querySelectorAll('.explorer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
  });

  // Update backgrounds
  document.querySelectorAll('.explorer-bg').forEach(bg => {
    bg.classList.toggle('active', bg.id === `bg${view.charAt(0).toUpperCase() + view.slice(1)}`);
  });

  // Update text with fade
  const detailBox = document.getElementById('explorerDetails');
  detailBox.style.opacity = '0';
  detailBox.style.transform = 'translateX(-20px)';
  
  setTimeout(() => {
    document.getElementById('expTitle').textContent = data.title;
    document.getElementById('expDesc').textContent = data.desc;
    const stats = detailBox.querySelectorAll('strong');
    stats[0].textContent = data.cap;
    stats[1].textContent = data.aes;
    
    detailBox.style.opacity = '1';
    detailBox.style.transform = 'translateX(0)';
  }, 300);
}

document.querySelectorAll('.explorer-tab').forEach(tab => {
  tab.onclick = () => switchExplorerView(tab.dataset.view);
});

// ===== WEATHER WIDGET MOCK =====
function initWeatherWidget() {
  const now = new Date();
  const hour = now.getHours();
  let temp, icon, cond;

  if (hour >= 6 && hour < 18) {
    temp = 30 + Math.floor(Math.random() * 3);
    icon = '🌤️';
    cond = 'Partly Cloudy';
  } else {
    temp = 25 + Math.floor(Math.random() * 3);
    icon = '🌙';
    cond = 'Clear Sky';
  }

  document.getElementById('weaTemp').textContent = `${temp}°C`;
  document.getElementById('weaIcon').textContent = icon;
  document.getElementById('weaCond').textContent = cond;
}

// Initialize new features
initWeatherWidget();
// Periodically update weather for realism
setInterval(initWeatherWidget, 600000);

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

// ===== BOOKING WIZARD =====
let currentStep = 1;
const wizardState = {
  venue: 'Pearl Ballroom',
  date: '',
  extras: [],
  contact: {}
};

function goToStep(step) {
  if (step < 1 || step > 4) return;
  
  // Validation
  if (step > currentStep) {
    if (currentStep === 2 && !document.getElementById('wizDate').value) {
      showToast('Please select a date first.', '#c0392b'); return;
    }
  }

  // Populate Summary in Step 4
  if (step === 4) {
    const venue = wizardState.venue;
    const date = document.getElementById('wizDate').value;
    const event = document.getElementById('wizEvent').value;
    const extras = Array.from(document.querySelectorAll('input[name="extra"]:checked')).map(el => el.value);
    
    document.getElementById('wizardSummary').innerHTML = `
      <div class="summary-item"><label>Venue</label><span>${venue}</span></div>
      <div class="summary-item"><label>Date</label><span>${date || 'Not Selected'}</span></div>
      <div class="summary-item"><label>Event</label><span>${event}</span></div>
      <div class="summary-item"><label>Extras</label><span>${extras.length ? extras.join(', ') : 'None'}</span></div>
    `;
  }

  // Update UI
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`wizardStep${step}`).classList.add('active');
  
  document.querySelectorAll('.p-step').forEach((s, idx) => {
    s.classList.toggle('active', idx + 1 === step);
    s.classList.toggle('completed', idx + 1 < step);
  });

  document.getElementById('wizardBar').style.width = `${(step / 4) * 100}%`;
  
  // Nav buttons
  document.getElementById('wizPrev').style.display = step === 1 ? 'none' : 'block';
  document.getElementById('wizNext').style.display = step === 4 ? 'none' : 'block';
  document.getElementById('wizSubmit').style.display = step === 4 ? 'block' : 'none';

  currentStep = step;
}

// Venue Selection
document.querySelectorAll('.venue-card').forEach(card => {
  card.onclick = function() {
    document.querySelectorAll('.venue-card').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    wizardState.venue = this.dataset.venue;
  };
});

// Nav Clicks
document.getElementById('wizNext').onclick = () => goToStep(currentStep + 1);
document.getElementById('wizPrev').onclick = () => goToStep(currentStep - 1);

// Final Submit
document.getElementById('wizSubmit').onclick = function() {
  const firstName = document.getElementById('wizFirst').value.trim();
  const lastName = document.getElementById('wizLast').value.trim();
  const email = document.getElementById('wizEmail').value.trim();
  const phone = document.getElementById('wizPhone').value.trim();
  const date = document.getElementById('wizDate').value;
  const event = document.getElementById('wizEvent').value;

  if (!firstName || !lastName || !email) {
    showToast('Please complete your contact details.', '#c0392b');
    return;
  }

  const extras = Array.from(document.querySelectorAll('input[name="extra"]:checked')).map(el => el.value);

  const newBooking = {
    id: Date.now(),
    client: `${firstName} ${lastName}`,
    email: email,
    phone: phone,
    event: event,
    venue: wizardState.venue,
    date: date,
    extras: extras,
    status: 'pending'
  };

  bookings.push(newBooking);
  saveBookings();

  // Refresh views
  if (document.getElementById('adminPanel').classList.contains('open')) {
    refreshAdminBookings();
    initAdminCharts();
  }

  showToast('✦ Reservation Secured! Download your Soft Quote PDF.');
  
  // PDF Generation
  generateSoftQuotePDF(newBooking);

  // Reset Wizard
  setTimeout(() => {
    goToStep(1);
    document.querySelectorAll('input[name="extra"]').forEach(el => el.checked = false);
    document.getElementById('wizFirst').value = '';
    document.getElementById('wizLast').value = '';
    document.getElementById('wizEmail').value = '';
    document.getElementById('wizPhone').value = '';
    if (document.getElementById('wizDate')._flatpickr) document.getElementById('wizDate')._flatpickr.clear();
  }, 1000);
};

// ===== SOFT QUOTE PDF (jsPDF) =====
function generateSoftQuotePDF(booking) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Branding Colors
  const gold = [201, 168, 76];
  const dark = [30, 30, 26];

  // Header
  doc.setFillColor(30, 30, 26);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text('9 WAVES EVENTS PLACE', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('PREMIUM RESORT & EVENTS VENUE', 105, 30, { align: 'center' });

  // Soft Quote Title
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFontSize(16);
  doc.text('SOFT QUOTE PREVIEW', 20, 55);
  
  doc.setDrawColor(201, 168, 76);
  doc.line(20, 58, 80, 58);

  // Client Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Client: ${booking.client}`, 20, 70);
  doc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, 140, 70);

  // Event Details Table
  doc.setFillColor(245, 245, 245);
  doc.rect(15, 80, 180, 50, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('EVENT TYPE', 20, 90);
  doc.text('RESERVED DATE', 70, 90);
  doc.text('SELECTED VENUE', 130, 90);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(booking.event.toUpperCase(), 20, 100);
  doc.text(booking.date || 'To be discussed', 70, 100);
  doc.text(booking.venue, 130, 100);

  // Add-ons / Extras
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFontSize(14);
  doc.text('ENHANCEMENTS & EXTRAS', 20, 145);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  let y = 155;
  if (booking.extras && booking.extras.length > 0) {
    booking.extras.forEach(extra => {
      doc.text(`✦ ${extra}`, 25, y);
      y += 8;
    });
  } else {
    doc.text('No optional extras selected.', 25, y);
  }

  // Pricing Estimation
  let basePrice = 85000; // Default for Garden
  if (booking.venue === 'Pearl Ballroom') basePrice = 125000;
  if (booking.venue === 'Tidal Pool Terrace') basePrice = 65000;
  
  const extrasCost = (booking.extras ? booking.extras.length : 0) * 15000;
  const totalEst = basePrice + extrasCost;

  doc.setFillColor(252, 250, 247);
  doc.rect(120, 180, 75, 40, 'F');
  doc.setDrawColor(229, 223, 213);
  doc.rect(120, 180, 75, 40, 'S');

  doc.setFontSize(10);
  doc.text('ESTIMATED STARTING AT', 125, 190);
  doc.setFontSize(18);
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.text(`PHP ${totalEst.toLocaleString()}`, 125, 205);

  // Footer / Disclaimer
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('Terms and Conditions:', 20, 240);
  doc.text('1. This is a non-binding soft quote for planning purposes only.', 20, 248);
  doc.text('2. Prices are subject to final contract and guest count verification.', 20, 254);
  doc.text('3. Venue reservation is confirmed only upon payment of reservation fee.', 20, 260);

  doc.setFontSize(10);
  doc.text('Thank you for choosing 9 Waves Events Place.', 105, 280, { align: 'center' });

  // Save the PDF
  doc.save(`9Waves_Quote_${booking.client.replace(/\s/g, '_')}.pdf`);
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.onclick=function(e){
    const t=document.querySelector(this.getAttribute('href'));
    if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); }
  };
});

// ===== REAL-TIME VALIDATION =====
function validateInput(e) {
  const el = e.target;
  if (!el.value) {
    el.classList.remove('valid', 'invalid');
    return;
  }
  
  let isValid = el.checkValidity();
  // Extra check for password length
  if (el.type === 'password' && el.id !== 'adminKey' && el.id !== 'loginPassword') {
    isValid = el.value.length >= 6;
  }
  
  if (isValid) {
    el.classList.add('valid');
    el.classList.remove('invalid');
  } else {
    el.classList.add('invalid');
    el.classList.remove('valid');
  }
}

document.querySelectorAll('input, select, textarea').forEach(input => {
  input.addEventListener('input', validateInput);
  input.addEventListener('change', validateInput);
});

// ===== INIT =====
updateNav();
if (window.flatpickr) {
  flatpickr("#wizDate", {
    minDate: "today",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    disableMobile: "true",
    inline: false
  });
}

// ===== LIGHTBOX LOGIC =====
const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lightboxImage');
const lbCap = document.getElementById('lightboxCaption');
const lbClose = document.getElementById('lightboxClose');
let currentLbIndex = 0;
let lbItems = [];

function getBgUrl(el) {
  if (!el) return '';
  const bg = window.getComputedStyle(el).backgroundImage;
  if (!bg || bg === 'none') return '';
  return bg.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
}

function updateLightbox() {
  const item = lbItems[currentLbIndex];
  if (!item) return;
  lbImg.src = item.url;
  lbCap.textContent = item.caption;
}

function openLightbox(index) {
  currentLbIndex = index;
  updateLightbox();
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lb.classList.remove('open');
  document.body.style.overflow = '';
}

function initLightbox() {
  // Clear any existing list
  lbItems = [];
  
  // Find all components that should be lightboxed
  const galleryItems = document.querySelectorAll('.gallery-item');
  const venueCards = document.querySelectorAll('.venue-card');
  
  // Build the unified items list
  galleryItems.forEach(el => {
    const bg = el.querySelector('.gallery-bg');
    const cap = el.querySelector('.gallery-item-label')?.textContent || 'Gallery View';
    lbItems.push({ el, url: getBgUrl(bg), caption: cap });
  });
  
  venueCards.forEach(el => {
    const bg = el.querySelector('.venue-img-bg');
    const cap = el.querySelector('.venue-name')?.textContent || 'Venue View';
    lbItems.push({ el, url: getBgUrl(bg), caption: cap });
  });

  // Attach single event listener to each
  lbItems.forEach((item, idx) => {
    item.el.addEventListener('click', (e) => {
      // Don't open if clicking a child button/link (like "Book Now")
      if (e.target.closest('a') || e.target.closest('button')) return;
      openLightbox(idx);
    });
  });
}

lbClose.onclick = closeLightbox;
lb.onclick = (e) => { if (e.target === lb) closeLightbox(); };
document.getElementById('lbPrev').onclick = (e) => {
  e.stopPropagation();
  currentLbIndex = (currentLbIndex - 1 + lbItems.length) % lbItems.length;
  updateLightbox();
};
document.getElementById('lbNext').onclick = (e) => {
  e.stopPropagation();
  currentLbIndex = (currentLbIndex + 1) % lbItems.length;
  updateLightbox();
};

initLightbox();

// ===== ESTIMATOR LOGIC =====
const PRICES = {
  ripple: { base: 45000, pax: 100, extra: 350 },
  crest: { base: 85000, pax: 200, extra: 450 },
  sovereign: { base: 150000, pax: 500, extra: 600 }
};

function updateCalculator() {
  const pkgKey = document.getElementById('estPackage').value;
  const guests = parseInt(document.getElementById('estGuests').value);
  const pkg = PRICES[pkgKey];
  
  document.getElementById('guestCountLabel').textContent = guests;
  
  let total = pkg.base;
  const extraGuests = Math.max(0, guests - pkg.pax);
  const extraCost = extraGuests * pkg.extra;
  total += extraCost;
  
  const addons = document.querySelectorAll('.est-addon:checked');
  let addonTotal = 0;
  addons.forEach(a => addonTotal += parseInt(a.dataset.price));
  total += addonTotal;
  
  // Format price
  const fmt = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
  document.getElementById('totalPrice').textContent = fmt.format(total).replace('PHP', '₱');
  
  const pkgName = pkgKey.charAt(0).toUpperCase() + pkgKey.slice(1);
  document.getElementById('estSummary').innerHTML = `
    <strong>${pkgName} Package</strong> (${guests} Guests)<br>
    Base + Extra Head: ${fmt.format(pkg.base + extraCost).replace('PHP', '₱')}<br>
    Add-ons: ${fmt.format(addonTotal).replace('PHP', '₱')}
  `;
}

document.getElementById('estPackage').onchange = updateCalculator;
document.getElementById('estGuests').oninput = updateCalculator;
document.querySelectorAll('.est-addon').forEach(a => a.onchange = updateCalculator);

updateCalculator();

// ===== AVAILABILITY CALENDAR =====
let availCal;
function updateAvailabilityCalendar() {
  if (!availCal) {
    availCal = flatpickr("#availabilityCal", {
      inline: true,
      minDate: "today",
      onDayCreate: (dObj, dStr, fp, dayElem) => {
        const dateStr = dayElem.dateObj.toISOString().split('T')[0];
        const match = bookings.find(b => b.date === dateStr);
        if (match) {
          dayElem.classList.add(match.status);
          dayElem.title = `${match.event} (${match.status})`;
        }
      }
    });
  } else {
    availCal.redraw();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  updateAvailabilityCalendar();
  goToStep(1); // Start Wizard at Step 1
});

// Update Flatpickr initialization
if (window.flatpickr) {
  flatpickr("#wizDate", {
    minDate: "today",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    disableMobile: "true",
    inline: false
  });
} 

// ===== ADMIN ANALYTICS (CHART.JS) =====
let trendChart, statusChart;
function initAdminCharts() {
  const trendCtx = document.getElementById('bookingTrendChart');
  const typeCtx = document.getElementById('eventTypeChart');
  if (!trendCtx || !typeCtx) return;

  // Prepare data: Bookings per month
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyData = new Array(12).fill(0);
  bookings.filter(b => b.status === 'confirmed').forEach(b => {
    const m = new Date(b.date).getMonth();
    monthlyData[m]++;
  });

  // Prepare data: Event Types
  const types = {};
  bookings.forEach(b => {
    types[b.event] = (types[b.event] || 0) + 1;
  });

  if (trendChart) trendChart.destroy();
  if (statusChart) statusChart.destroy();

  trendChart = new Chart(trendCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Confirmed Bookings',
        data: monthlyData,
        backgroundColor: '#7a8c6e',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });

  statusChart = new Chart(typeCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(types),
      datasets: [{
        data: Object.values(types),
        backgroundColor: ['#7a8c6e', '#c9a84c', '#4e5e45', '#e2c97e', '#1e1e1a'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }
    }
  });
}
