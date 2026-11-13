// Kurumsal e-posta kontrolü — backend'deki CorporateEmailChecker.cs ile aynı mantık,
// burada sadece anlık kullanıcı geri bildirimi için (asıl kontrol backend'de).
export const FREE_MAIL = ['gmail.com','googlemail.com','hotmail.com','hotmail.com.tr','outlook.com','outlook.com.tr',
  'live.com','msn.com','yahoo.com','yahoo.com.tr','ymail.com','icloud.com','me.com','mac.com','yandex.com',
  'yandex.com.tr','yandex.ru','mail.ru','aol.com','gmx.com','gmx.de','proton.me','protonmail.com','zoho.com',
  'mynet.com','windowslive.com'];

export function hostOf(url){
  try {
    const u = new URL(/^https?:\/\//i.test((url||'').trim()) ? url.trim() : 'https://' + (url||'').trim());
    const h = u.hostname.toLowerCase().replace(/^www\./, '');
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) ? h : null;
  } catch { return null; }
}

export const emailDomain = e => (String(e||'').trim().toLowerCase().match(/^[^\s@]+@([a-z0-9.-]+\.[a-z]{2,})$/) || [])[1] || null;

export function domainCheck(email, website){
  const h = hostOf(website || ''), d = emailDomain(email || '');
  if (!d) return { ok:false, msg:'Geçerli bir e-posta adresi girin.' };
  if (FREE_MAIL.includes(d)) return { ok:false, msg:'Ücretsiz e-posta sağlayıcıları kabul edilmiyor. Firmanızın kurumsal adresini kullanın.' };
  if (!h) return { ok:false, msg:'Önce geçerli bir firma web sitesi girin.' };
  const ok = d === h || d.endsWith('.' + h) || h.endsWith('.' + d);
  return ok ? { ok:true, msg:`Alan adı doğrulandı: ${d}` } : { ok:false, msg:`E-posta adresi firmanızın alan adıyla bitmeli: …@${h}` };
}
