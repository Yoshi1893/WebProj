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
    
    let actionBtn = '';
    if (b.status === 'pending') {
      actionBtn = `<button class="tbl-btn tbl-confirm" onclick="changeBookingStatus(${b.id}, 'confirmed')">Confirm</button>`;
    } else if (b.status === 'confirmed') {
      actionBtn = `<button class="tbl-btn tbl-cancel" onclick="changeBookingStatus(${b.id}, 'cancelled')">Cancel</button>`;
    } else {
      actionBtn = `<span style="color:#ccc;font-size:13px;">—</span>`;
    }

    return `
      <tr>
        <td>${escapeHTML(b.client)}</td>
        <td>${escapeHTML(b.event)}</td>
        <td>${escapeHTML(b.venue)}</td>
        <td>${new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
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
document.getElementById('inquiryForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const firstName = document.getElementById('inqFirst').value;
  const lastName = document.getElementById('inqLast').value;
  const email = document.getElementById('inqEmail').value;
  const phone = document.getElementById('inqPhone').value;
  const event = document.getElementById('inqEvent').value;
  const venue = 'To be discussed'; // Optional: add a venue selector to form
  const date = document.getElementById('inqDate').value;

  if (!date) {
    showToast('Please select a date for your event.', '#c0392b');
    return;
  }

  const newBooking = {
    id: Date.now(),
    client: `${firstName} ${lastName}`,
    email: email,
    phone: phone,
    event: event,
    venue: venue,
    date: date,
    status: 'pending'
  };

  bookings.push(newBooking);
  saveBookings();
  
  // Refresh admin views if open
  if (document.getElementById('adminPanel').classList.contains('open')) {
    refreshAdminBookings();
    initAdminCharts();
  }

  showToast('✦ Inquiry sent! We\'ll be in touch within 24 hours.');
  this.reset();
  
  // Reset flatpickr
  const fp = document.getElementById('inqDate')._flatpickr;
  if (fp) fp.clear();
});

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
  flatpickr("#inqDate", {
    minDate: "today",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    disableMobile: "true"
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
});

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
