/* Student Transport Pass Request System - plain HTML/CSS/JS, data kept in localStorage */
const KEY = 'tpass_v1';
const ADMIN = { u: 'admin', p: 'admin123' };
const ROUTES = { 'Campus – City Centre': 600, 'Campus – Railway Station': 500, 'Campus – Bus Stand': 450, 'Campus – Airport Road': 900 };
const TYPES = { Monthly: [1, 0], Quarterly: [3, 0.1], Semester: [6, 0.15] }; // [months, discount]
const COURSES = ['B.Tech', 'BCA', 'MCA', 'MBA', 'B.Sc', 'B.Com', 'Other'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const fee = (route, type) => { const [m, d] = TYPES[type]; return Math.round(ROUTES[route] * m * (1 - d)); };
const addMonths = (d, m) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10); };

/* ---------- storage ---------- */
let data = [];
try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { data = null; }
if (!Array.isArray(data)) { data = seed(); save(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
const nextId = () => 'TP' + (Math.max(1000, ...data.map(r => +r.id.slice(2))) + 1);

function seed() {
  const s = [
    ['Aarav Sharma', '12301001', 'B.Tech', 'Campus – City Centre', 'Monthly', 'Approved', ''],
    ['Simran Kaur', '12301002', 'BCA', 'Campus – Railway Station', 'Quarterly', 'Pending', ''],
    ['Rohan Verma', '12301003', 'MBA', 'Campus – Airport Road', 'Semester', 'Pending', ''],
    ['Neha Gupta', '12301004', 'B.Sc', 'Campus – Bus Stand', 'Monthly', 'Rejected', 'Fee receipt not attached'],
    ['Karan Singh', '12301005', 'MCA', 'Campus – City Centre', 'Quarterly', 'Approved', '']
  ];
  return s.map((a, i) => ({
    id: 'TP' + (1001 + i), name: a[0], reg: a[1], email: a[0].split(' ')[0].toLowerCase() + '@student.edu',
    phone: '98765432' + (10 + i), course: a[2], stop: 'Model Town', route: a[3], type: a[4],
    start: today(), fee: fee(a[3], a[4]), status: a[5], remark: a[6], created: Date.now() - i * 864e5
  }));
}

/* ---------- shared form pieces ---------- */
function fieldsHTML(r, admin) {
  const o = (a, v) => a.map(k => `<option${k === v ? ' selected' : ''}>${esc(k)}</option>`).join('');
  const t = (n, l, type = 'text', x = '') => `<label>${l}<input name="${n}" type="${type}" value="${esc(r[n])}" ${x}><small class="err"></small></label>`;
  const s = (n, l, a) => `<label>${l}<select name="${n}"><option value="">Select</option>${o(a, r[n])}</select><small class="err"></small></label>`;
  return `<div class="grid">
    ${t('name', 'Full name', 'text', 'autocomplete="name"')}
    ${t('reg', 'Registration number', 'text', 'inputmode="numeric"')}
    ${t('email', 'Email', 'email', 'autocomplete="email"')}
    ${t('phone', 'Mobile number', 'tel', 'inputmode="numeric"')}
    ${s('course', 'Course', COURSES)}
    ${t('stop', 'Pickup stop or area')}
    ${s('route', 'Route', Object.keys(ROUTES))}
    ${s('type', 'Pass type', Object.keys(TYPES))}
    ${t('start', 'Start date', 'date')}
    ${admin ? s('status', 'Status', ['Pending', 'Approved', 'Rejected']) : ''}
  </div><p class="feeline">Pass fee: <strong class="fee">Choose route and pass type</strong></p>`;
}

function updateFee(form) {
  const r = form.elements.route.value, t = form.elements.type.value;
  $('.fee', form).textContent = r && t ? '₹' + fee(r, t) : 'Choose route and pass type';
}

function clearErrors(form) {
  $$('.err', form).forEach(s => (s.textContent = ''));
  $$('.bad', form).forEach(i => i.classList.remove('bad'));
}

/* returns [cleanValues, errors]; skipId = record being edited */
function check(form, skipId) {
  clearErrors(form);
  const v = {};
  new FormData(form).forEach((x, k) => (v[k] = String(x).trim()));
  const e = {};
  if (!/^[A-Za-z][A-Za-z .'-]{2,39}$/.test(v.name)) e.name = 'Enter your full name using letters only (3 to 40 characters).';
  if (!/^\d{6,10}$/.test(v.reg)) e.reg = 'Registration number must be 6 to 10 digits.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = 'Enter a valid email, like name@college.edu.';
  if (!/^[6-9]\d{9}$/.test(v.phone)) e.phone = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  if (!v.course) e.course = 'Select your course.';
  if (v.stop.length < 3) e.stop = 'Enter your pickup stop or area.';
  if (!v.route) e.route = 'Select a route.';
  if (!v.type) e.type = 'Select a pass type.';
  if (!v.start) e.start = 'Choose a start date.';
  else if (!skipId && v.start < today()) e.start = 'Start date cannot be in the past.';
  if (!e.reg && !e.route && data.some(r => r.id !== skipId && r.reg === v.reg && r.route === v.route && r.status === 'Pending'))
    e.reg = 'A pending request for this route already exists for this registration number.';
  Object.entries(e).forEach(([k, m]) => {
    const i = form.elements[k];
    i.classList.add('bad');
    i.parentElement.querySelector('.err').textContent = m;
  });
  return [v, e];
}

let tt;
function toast(m, kind) {
  const t = $('#toast');
  t.textContent = m;
  t.className = 'show ' + (kind || '');
  clearTimeout(tt);
  tt = setTimeout(() => (t.className = ''), 4200);
}

/* ---------- navigation ---------- */
let isAdmin = false;
function show(v) {
  $$('.view').forEach(s => (s.hidden = s.id !== v));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  if (v === 'admin') {
    $('#login').hidden = isAdmin;
    $('#adminBody').hidden = !isAdmin;
    if (isAdmin) renderAdmin();
  }
}
$$('nav button').forEach(b => (b.onclick = () => show(b.dataset.view)));

/* ---------- student: request form ---------- */
const rf = $('#reqForm');
rf.innerHTML = fieldsHTML({}) + '<div class="row"><button class="btn">Submit request</button><button type="reset" class="btn ghost">Clear form</button></div>';
rf.addEventListener('input', () => updateFee(rf));
rf.addEventListener('reset', () => setTimeout(() => { clearErrors(rf); updateFee(rf); }));
rf.onsubmit = e => {
  e.preventDefault();
  const [v, err] = check(rf);
  if (Object.keys(err).length) return toast('Fix the highlighted fields and submit again.', 'bad');
  const r = { id: nextId(), ...v, fee: fee(v.route, v.type), status: 'Pending', remark: '', created: Date.now() };
  data.unshift(r);
  save();
  $('#trackReg').value = r.reg;
  rf.reset();
  toast(`Request ${r.id} submitted. Use "Track request" with your registration number to see its status.`);
};

/* ---------- student: tracking ---------- */
function ticketHTML(r) {
  const last = r.status === 'Pending' ? 'Decision' : r.status;
  return `<article class="ticket ${r.status}">
    <div><h3>${esc(r.route)}</h3>
      <p>${r.type} pass, ₹${r.fee}</p>
      <p class="mut">Request ${r.id} for ${esc(r.name)}, starting ${r.start}</p>
      ${r.status === 'Approved' ? `<p><strong>Valid ${r.start} to ${addMonths(r.start, TYPES[r.type][0])}</strong></p>` : ''}
      ${r.status === 'Rejected' ? `<p class="badtxt">Reason: ${esc(r.remark || 'Not specified')}</p>` : ''}
    </div>
    <span class="pill ${r.status}">${r.status}</span>
    <div class="steps">
      <span class="done">Submitted</span>
      <span class="${r.status === 'Pending' ? 'now' : 'done'}">Under review</span>
      <span class="${r.status === 'Approved' ? 'done' : r.status === 'Rejected' ? 'no' : ''}">${last}</span>
    </div></article>`;
}
$('#trackForm').onsubmit = e => {
  e.preventDefault();
  const reg = $('#trackReg').value.trim();
  if (!/^\d{6,10}$/.test(reg)) return toast('Enter a registration number of 6 to 10 digits.', 'bad');
  const list = data.filter(r => r.reg === reg);
  $('#trackOut').innerHTML = list.length ? list.map(ticketHTML).join('') :
    `<p class="mut">No requests found for ${esc(reg)}. Submit one from "Request a pass".</p>`;
};

/* ---------- admin ---------- */
$('#login').onsubmit = e => {
  e.preventDefault();
  const f = e.target.elements;
  if (f.u.value.trim().toLowerCase() === ADMIN.u && f.p.value.trim() === ADMIN.p) { isAdmin = true; f.p.value = ''; show('admin'); toast('Signed in as admin.'); }
  else toast('Wrong username or password. Use admin / admin123.', 'bad');
};
$('#logout').onclick = () => { isAdmin = false; show('admin'); toast('Signed out.'); };

$('#fr').innerHTML += Object.keys(ROUTES).map(k => `<option>${k}</option>`).join('');
$('#ft').innerHTML += Object.keys(TYPES).map(k => `<option>${k}</option>`).join('');
['q', 'fs', 'fr', 'ft'].forEach(id => $('#' + id).addEventListener('input', renderAdmin));
$('#clear').onclick = () => { ['q', 'fs', 'fr', 'ft'].forEach(id => ($('#' + id).value = '')); renderAdmin(); };

function renderAdmin() {
  const q = $('#q').value.toLowerCase(), fs = $('#fs').value, fr = $('#fr').value, ft = $('#ft').value;
  const count = s => data.filter(r => r.status === s).length;
  const income = data.filter(r => r.status === 'Approved').reduce((a, r) => a + r.fee, 0);
  $('#stats').innerHTML = [['Total requests', data.length], ['Pending', count('Pending')], ['Approved', count('Approved')], ['Rejected', count('Rejected')], ['Fees from approved passes', '₹' + income]]
    .map(([l, n]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');

  const per = Object.keys(ROUTES).map(k => [k, data.filter(r => r.route === k).length]);
  const max = Math.max(1, ...per.map(p => p[1]));
  $('#bars').innerHTML = per.map(([k, n]) => `<div class="bar"><span>${k}</span><i style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`).join('');

  const L = data.filter(r => (!fs || r.status === fs) && (!fr || r.route === fr) && (!ft || r.type === ft) &&
    (!q || [r.name, r.reg, r.id, r.email].some(x => x.toLowerCase().includes(q))));
  $('#rows').innerHTML = L.map(r => `<tr>
    <td>${r.id}</td><td>${esc(r.name)}<small>${r.reg}, ${esc(r.course)}</small></td>
    <td>${esc(r.route)}<small>${esc(r.stop)}</small></td><td>${r.type}</td><td>₹${r.fee}</td><td>${r.start}</td>
    <td><span class="pill ${r.status}">${r.status}</span>${r.remark ? `<small>${esc(r.remark)}</small>` : ''}</td>
    <td>${r.status !== 'Approved' ? `<button class="btn ok" data-act="ok" data-id="${r.id}">Approve</button>` : ''}
        ${r.status !== 'Rejected' ? `<button class="btn no" data-act="no" data-id="${r.id}">Reject</button>` : ''}
        <button class="btn ghost" data-act="edit" data-id="${r.id}">Edit</button>
        <button class="btn del" data-act="del" data-id="${r.id}">Delete</button></td></tr>`).join('');
  $('#empty').textContent = L.length ? '' : 'No requests match these filters. Clear the filters to see all requests.';
}

$('#rows').onclick = e => {
  const b = e.target.closest('button');
  if (!b) return;
  const r = data.find(x => x.id === b.dataset.id), a = b.dataset.act;
  if (a === 'ok') { r.status = 'Approved'; r.remark = ''; save(); renderAdmin(); toast(`${r.id} approved.`); }
  if (a === 'no') {
    const m = prompt('Reason for rejecting this request?');
    if (m === null) return;
    if (!m.trim()) return toast('Enter a reason to reject a request.', 'bad');
    r.status = 'Rejected'; r.remark = m.trim(); save(); renderAdmin(); toast(`${r.id} rejected.`);
  }
  if (a === 'edit') openEdit(r);
  if (a === 'del' && confirm(`Delete request ${r.id} for ${r.name}?`)) { data = data.filter(x => x !== r); save(); renderAdmin(); toast('Request deleted.'); }
};

/* admin: edit dialog (same fields and validation as the student form) */
const dlg = $('#dlg'), ef = $('#editForm');
let editing = null;
function openEdit(r) {
  editing = r;
  ef.innerHTML = `<h3>Edit request ${r.id}</h3>` + fieldsHTML(r, true) +
    '<div class="row"><button class="btn">Save changes</button><button type="button" class="btn ghost" id="cancel">Cancel</button></div>';
  updateFee(ef);
  dlg.showModal();
}
ef.addEventListener('input', () => updateFee(ef));
ef.onclick = e => { if (e.target.id === 'cancel') dlg.close(); };
ef.onsubmit = e => {
  e.preventDefault();
  const [v, err] = check(ef, editing.id);
  if (Object.keys(err).length) return toast('Fix the highlighted fields and save again.', 'bad');
  Object.assign(editing, v, { fee: fee(v.route, v.type) });
  if (v.status === 'Rejected' && !editing.remark) editing.remark = 'Updated by admin';
  if (v.status !== 'Rejected') editing.remark = '';
  save(); dlg.close(); renderAdmin(); toast(`${editing.id} updated.`);
};

/* admin: export */
$('#export').onclick = () => {
  const h = ['id', 'name', 'reg', 'email', 'phone', 'course', 'stop', 'route', 'type', 'fee', 'start', 'status', 'remark'];
  const csv = [h, ...data.map(r => h.map(k => r[k]))].map(row => row.map(x => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'transport-pass-requests.csv';
  a.click();
  toast('CSV exported.');
};

updateFee(rf);
show('student');
