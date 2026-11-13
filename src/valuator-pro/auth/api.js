import { AUTH } from './onboardingConfig.js';

// Kurumsal e-posta kabul edilmeyen ücretsiz sağlayıcılar
export const FREE_MAIL = ['gmail.com','googlemail.com','hotmail.com','hotmail.com.tr','outlook.com','outlook.com.tr','live.com','msn.com',
  'yahoo.com','yahoo.com.tr','ymail.com','icloud.com','me.com','mac.com','yandex.com','yandex.com.tr','yandex.ru','mail.ru','aol.com',
  'gmx.com','gmx.de','proton.me','protonmail.com','zoho.com','mynet.com','windowslive.com'];

export function hostOf(url){
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : 'https://' + url.trim());
    const h = u.hostname.toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : null;
  } catch { return null; }
}
export const emailDomain = e => (String(e).trim().toLowerCase().match(/^[^\s@]+@([a-z0-9.-]+\.[a-z]{2,})$/) || [])[1] || null;

// E-posta alan adı web sitesiyle eşleşmeli (alt alan adlarına izin verilir: ik.firma.com ↔ firma.com)
export function domainCheck(email, website){
  const h = hostOf(website || ''), d = emailDomain(email || '');
  if (!d) return { ok:false, msg:'Geçerli bir e-posta adresi girin.' };
  // Ücretsiz e-posta sağlayıcı kısıtlaması kaldırıldı (istenerek) — FREE_MAIL listesi duruyor, gerekirse geri açılabilir.
  // if (FREE_MAIL.includes(d)) return { ok:false, msg:'Ücretsiz e-posta sağlayıcıları kabul edilmiyor. Firmanızın kurumsal adresini kullanın.' };
  // E-posta/website domain eşleşme zorunluluğu da kaldırıldı (istenerek) — h hâlâ hesaplanıyor (placeholder'da kullanılıyor).
  // if (!h) return { ok:false, msg:'Önce geçerli bir firma web sitesi girin.' };
  // const ok = d === h || d.endsWith('.' + h) || h.endsWith('.' + d);
  // return ok ? { ok:true, msg:`Alan adı doğrulandı: ${d}` } : { ok:false, msg:`E-posta adresi firmanızın alan adıyla bitmeli: …@${h}` };
  return { ok:true, msg:'' };
}

export function passwordCheck(p){
  const rules = [
    { ok: p.length >= 10, t:'En az 10 karakter' },
    { ok: /[a-zçğıöşü]/.test(p) && /[A-ZÇĞİÖŞÜ]/.test(p), t:'Büyük ve küçük harf' },
    { ok: /\d/.test(p), t:'En az bir rakam' },
  ];
  return { ok: rules.every(r=>r.ok), rules, score: rules.filter(r=>r.ok).length + (p.length>=14?1:0) };
}

// ── Oturum ──
const SKEY = 'valuator-session';
export const getSession = () => { try { return JSON.parse(localStorage.getItem(SKEY)); } catch { return null; } };
export const setSession = s => { try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch { /* */ } };

// ── API modu (gerçek FinvestimaAPI backend) — authenticated fetch helper, backend hazır
// olunca startTask/resendTaskCode/confirmTask içinde kullanılacak. ──
async function post(path, body, token){
  const r = await fetch(AUTH.apiBase + path, { method: 'POST',
    headers: { 'Content-Type':'application/json', ...(token ? { Authorization:'Bearer '+token } : {}) }, body: JSON.stringify(body ?? {}) });
  const text = await r.text();
  let j; try { j = text ? JSON.parse(text) : {}; } catch { j = { error: text }; }
  if (!r.ok){
    const msg = typeof j === 'string' ? j : (j.error || j.title || (j.errors && Object.values(j.errors).flat()[0]) || 'Sunucu hatası ('+r.status+')');
    throw Object.assign(new Error(msg), { code: j.code });
  }
  return j;
}

// ── Demo modu (tarayıcı içi, backend hazır olana kadar) ──
const DKEY = 'valuator-onboard-demo';
const db = () => { try { return JSON.parse(localStorage.getItem(DKEY)) || {}; } catch { return {}; } };
const save = d => localStorage.setItem(DKEY, JSON.stringify(d));
const newCode = () => String(Math.floor(100000 + Math.random()*900000));
const fail = (msg, code) => { throw Object.assign(new Error(msg), { code }); };

const demo = {
  // Kod, giriş yapılan hesabın e-postasına gider — demo modda ekranda gösterilir.
  async startTask(draft){
    const code = newCode();
    save({ code, exp: Date.now()+15*60e3, tries:0, sentAt: Date.now(), draft });
    return { demoCode: code };
  },
  async resendTaskCode(draft){
    const d = db();
    if (d.sentAt && Date.now() - d.sentAt < AUTH.resendSeconds*1000) fail('Yeni kod için biraz bekleyin.', 'wait');
    const code = newCode(); save({ code, exp: Date.now()+15*60e3, tries:0, sentAt: Date.now(), draft });
    return { demoCode: code };
  },
  async confirmTask(draft, code){
    const d = db(); if (!d.code) fail('Önce bir kod isteyin.');
    if (d.tries >= 5) fail('Çok fazla hatalı deneme. Yeni kod isteyin.', 'locked');
    if (Date.now() > d.exp) fail('Kodun süresi doldu. Yeni kod isteyin.', 'expired');
    if (code !== d.code){ d.tries++; save(d); fail(`Kod hatalı. ${5-d.tries} deneme hakkınız kaldı.`, 'bad'); }
    save({});
    return { task: { id: 'demo-'+Date.now(), companyName: draft.company.name, title: 'Değerleme' } };
  },
};

const api = {
  async startTask(){
    const token = localStorage.getItem('storedToken');
    await post('/start-task', {}, token);
    return { demoCode: null };
  },
  async resendTaskCode(){
    const token = localStorage.getItem('storedToken');
    await post('/start-task', {}, token);
    return { demoCode: null };
  },
  async confirmTask(draft, code){
    const token = localStorage.getItem('storedToken');
    const r = await post('/confirm-task', {
      code,
      companyName: draft.company?.name, website: draft.company?.website, sector: draft.company?.sector,
      subSector: draft.company?.subSector, employees: draft.company?.employees, revenue: draft.company?.revenue, purpose: draft.company?.purpose,
      reportEmail: draft.reportEmail, fullName: draft.name, role: draft.role, phone: draft.phone,
    }, token);
    return { task: r };
  },
};

export const auth = AUTH.mode === 'api' ? api : demo;
export const isDemo = AUTH.mode !== 'api';
