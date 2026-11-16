import { useState } from 'react';
import { Panel } from '../ui.jsx';
import { useGetMyAccountStatusQuery, useStartCreditPurchaseMutation } from '../../slices/ValuatorProSlice.js';

// A0: "Kredi satın al". Admin onayı olmayan kullanıcı burada kilitli bir ekran görür;
// onaylı kullanıcı paket seçip Garanti Sanal POS'a yönlenir (3D Secure formu backend'den gelir).
const PACKAGES = [
  { credits: 1, priceTl: 15000, label: '1 task kredisi' },
  { credits: 3, priceTl: 40000, label: '3 task kredisi', note: 'En çok tercih edilen' },
  { credits: 10, priceTl: 120000, label: '10 task kredisi' },
];

export default function PurchaseCredits() {
  const { data: me, isLoading, refetch } = useGetMyAccountStatusQuery();
  const [startPurchase, { isLoading: starting }] = useStartCreditPurchaseMutation();
  const [picked, setPicked] = useState(PACKAGES[1].credits);
  const [err, setErr] = useState('');

  const pkg = PACKAGES.find(p => p.credits === picked);

  const buy = async () => {
    setErr('');
    try {
      const r = await startPurchase({ credits: pkg.credits, amountTl: pkg.priceTl }).unwrap();
      // Backend bir 3D Secure form-post HTML'i ya da { formUrl, fields } döner — gelince
      // burada gizli bir <form> oluşturup otomatik submit edeceğiz.
      if (r?.formUrl && r?.fields) {
        const form = document.createElement('form');
        form.method = 'POST'; form.action = r.formUrl;
        Object.entries(r.fields).forEach(([k, v]) => {
          const inp = document.createElement('input');
          inp.type = 'hidden'; inp.name = k; inp.value = v ?? '';
          form.appendChild(inp);
        });
        document.body.appendChild(form);
        form.submit();
      }
    } catch (e) {
      setErr(e.data?.error || e.data || e.message || 'Ödeme başlatılamadı.');
    }
  };

  return (
    <div className="left">
      <Panel title="Kredi satın al" sub="Her değerleme task'ı 1 kredi harcar. Kredi, Garanti Sanal POS üzerinden güvenli ödeme ile satın alınır.">
        {isLoading && <p className="muted">Yükleniyor…</p>}

        {!isLoading && (
          <p className="muted" style={{ marginTop: 0 }}>Mevcut bakiyeniz: <b style={{ color: 'var(--navy)' }}>{me?.creditBalance ?? 0} kredi</b></p>
        )}

        {!isLoading && !me?.isApproved && (
          <div className="ferr box" role="alert" style={{ marginBottom: 14 }}>
            Hesabınız henüz onaylanmadı. Satın alma yapabilmeniz için önce ekibimizin hesabınızı
            onaylaması gerekiyor. Onaylandığında bu sayfadan devam edebilirsiniz.
            <div style={{ marginTop: 8 }}>
              <button type="button" className="lnk" onClick={() => refetch()}>Durumu yenile</button>
            </div>
          </div>
        )}

        {!isLoading && me?.isApproved && (
          <>
            <div className="row3" style={{ marginTop: 10 }}>
              {PACKAGES.map(p => (
                <button
                  type="button"
                  key={p.credits}
                  onClick={() => setPicked(p.credits)}
                  className={'fld'}
                  style={{
                    textAlign: 'left', cursor: 'pointer', borderRadius: 10,
                    border: p.credits === picked ? '2px solid var(--gold, #D3A24A)' : '1px solid var(--line2, #284C86)',
                    padding: 14, background: p.credits === picked ? 'rgba(211,162,74,.08)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{p.label}</span>
                  <b style={{ display: 'block', fontSize: 20, marginTop: 4 }}>{p.priceTl.toLocaleString('tr-TR')} ₺</b>
                  {p.note && <span style={{ fontSize: 11.5, color: 'var(--gold, #B8862B)' }}>{p.note}</span>}
                </button>
              ))}
            </div>

            {err && <div className="ferr box" role="alert" style={{ marginTop: 14 }}>{err}</div>}

            <div className="actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn big" disabled={starting} onClick={buy}>
                {starting ? 'Yönlendiriliyor…' : `${pkg.priceTl.toLocaleString('tr-TR')} ₺ öde`}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Ödeme Garanti BBVA Sanal POS 3D Secure sayfasında tamamlanır; kart bilgileriniz bizim sunucularımızdan geçmez.
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
