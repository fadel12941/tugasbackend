const API_URL = '/api';
let TOKEN = localStorage.getItem('token') || null;
let USERNAME = localStorage.getItem('username') || null;

// ===== INIT =====
window.onload = () => {
  if (TOKEN) showDashboard();
  else showAuth();
};

function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('dashboard-section').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('dashboard-section').classList.remove('hidden');
  document.getElementById('welcome-user').textContent = '👋 Halo, ' + USERNAME + '!';
  loadBarang();
}

// ===== TAB SWITCH =====
function switchTab(tab) {
  var btnLogin  = document.getElementById('btn-login-tab');
  var btnReg    = document.getElementById('btn-register-tab');
  var formLogin = document.getElementById('form-login');
  var formReg   = document.getElementById('form-register');

  clearMsg('msg-login');
  clearMsg('msg-register');

  if (tab === 'login') {
    btnLogin.classList.add('active');
    btnReg.classList.remove('active');
    formLogin.classList.remove('hidden');
    formReg.classList.add('hidden');
  } else {
    btnReg.classList.add('active');
    btnLogin.classList.remove('active');
    formReg.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

// ===== REGISTER =====
async function handleRegister(e) {
  e.preventDefault();
  var username = document.getElementById('reg-username').value.trim();
  var password = document.getElementById('reg-password').value;
  var btn = document.getElementById('btn-register');
  var msg = document.getElementById('msg-register');

  if (password.length < 6) {
    showMsg(msg, 'Password minimal 6 karakter', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Mendaftarkan...';

  try {
    var res = await fetch(API_URL + '/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });
    var data = await res.json();

    if (res.ok) {
      showMsg(msg, '✅ ' + data.message, 'success');
      document.getElementById('form-register').reset();
      setTimeout(function() { switchTab('login'); }, 1500);
    } else {
      showMsg(msg, '❌ ' + data.message, 'error');
    }
  } catch (err) {
    showMsg(msg, '❌ Koneksi gagal. Coba lagi.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Daftar Sekarang';
  }
}

// ===== LOGIN =====
async function handleLogin(e) {
  e.preventDefault();
  var username = document.getElementById('login-username').value.trim();
  var password = document.getElementById('login-password').value;
  var btn = document.getElementById('btn-login');
  var msg = document.getElementById('msg-login');

  btn.disabled = true;
  btn.textContent = 'Masuk...';

  try {
    var res = await fetch(API_URL + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });
    var data = await res.json();

    if (res.ok) {
      TOKEN = data.token;
      USERNAME = data.username;
      localStorage.setItem('token', TOKEN);
      localStorage.setItem('username', USERNAME);
      showMsg(msg, '✅ Login berhasil!', 'success');
      setTimeout(showDashboard, 700);
    } else {
      showMsg(msg, '❌ ' + data.message, 'error');
    }
  } catch (err) {
    showMsg(msg, '❌ Koneksi gagal. Coba lagi.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Masuk';
  }
}

// ===== LOGOUT =====
function handleLogout() {
  TOKEN = null;
  USERNAME = null;
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  showAuth();
}

// ===== LOAD BARANG =====
async function loadBarang() {
  try {
    var res = await fetch(API_URL + '/barang', {
      headers: { Authorization: 'Bearer ' + TOKEN },
    });

    if (res.status === 401 || res.status === 403) {
      handleLogout();
      return;
    }

    var data = await res.json();
    renderBarang(data);
  } catch (err) {
    document.getElementById('barang-list').innerHTML =
      '<p style="color:#f87171;text-align:center">Gagal memuat data</p>';
  }
}

// ===== RENDER BARANG =====
function renderBarang(list) {
  var container = document.getElementById('barang-list');
  var badge = document.getElementById('jumlah-badge');
  badge.textContent = list.length + ' item';

  if (list.length === 0) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<span>📭</span>' +
        '<p>Belum ada barang. Tambahkan sekarang!</p>' +
      '</div>';
    return;
  }

  container.innerHTML = list.map(function(b) {
    return '<div class="barang-item" id="item-' + b.id + '">' +
      '<div class="barang-info">' +
        '<h3>' + escHtml(b.nama) + '</h3>' +
        '<p>' + (escHtml(b.keterangan) || 'Tidak ada keterangan') + ' · ' + formatDate(b.created_at) + '</p>' +
      '</div>' +
      '<div class="barang-meta">' +
        '<span class="kategori-tag">' + escHtml(b.kategori) + '</span>' +
        '<span class="jumlah-badge">×' + b.jumlah + '</span>' +
        '<button class="btn-hapus" onclick="hapusBarang(' + b.id + ')">🗑</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ===== TAMBAH BARANG =====
async function handleTambah(e) {
  e.preventDefault();
  var nama       = document.getElementById('item-nama').value.trim();
  var kategori   = document.getElementById('item-kategori').value;
  var jumlah     = document.getElementById('item-jumlah').value;
  var keterangan = document.getElementById('item-keterangan').value.trim();
  var btn = document.getElementById('btn-tambah');
  var msg = document.getElementById('msg-tambah');

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    var res = await fetch(API_URL + '/barang', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + TOKEN,
      },
      body: JSON.stringify({ nama: nama, kategori: kategori, jumlah: parseInt(jumlah), keterangan: keterangan }),
    });
    var data = await res.json();

    if (res.ok) {
      showMsg(msg, '✅ ' + data.message, 'success');
      document.getElementById('form-tambah').reset();
      loadBarang();
    } else {
      showMsg(msg, '❌ ' + data.message, 'error');
    }
  } catch (err) {
    showMsg(msg, '❌ Koneksi gagal.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Tambah Barang';
  }
}

// ===== HAPUS BARANG =====
async function hapusBarang(id) {
  if (!confirm('Yakin ingin menghapus barang ini?')) return;

  try {
    var res = await fetch(API_URL + '/barang/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + TOKEN },
    });

    if (res.ok) {
      var el = document.getElementById('item-' + id);
      if (el) { el.style.opacity = '0'; setTimeout(function() { loadBarang(); }, 300); }
    } else {
      alert('Gagal menghapus barang');
    }
  } catch (err) {
    alert('Koneksi gagal');
  }
}

// ===== HELPERS =====
function showMsg(el, text, type) {
  el.textContent = text;
  el.className = 'msg ' + type;
}

function clearMsg(id) {
  var el = document.getElementById(id);
  if (el) { el.textContent = ''; el.className = 'msg'; }
}

// Escaping HTML to prevent XSS
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatDate(dt) {
  if (!dt) return '';
  var d = new Date(dt);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}
