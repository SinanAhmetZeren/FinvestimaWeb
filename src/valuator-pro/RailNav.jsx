const LAYERS = [
  { k:'L0', n:'İşler', m:'Değerleme seçimi' },
  { k:'L1', n:'Girdiler', m:'Dosya alımı, kurlar' },
  { k:'L2', n:'Mizan ve eşleme', m:'Hesap planı kontrolü' },
  { k:'L3', n:'Bilanço özetleri', m:'TL, USD, oranlar' },
  { k:'L4', n:'Gelir tablosu', m:'Normalize FAVÖK' },
  { k:'L5', n:'Varsayımlar', m:'Projeksiyon sürücüleri' },
  { k:'L6', n:'Değerleme', m:'Üç yöntem' },
  { k:'L7', n:'Denetim ve çıktı', m:'Bulgular, rapor' },
];

export default function RailNav({ layer, setLayer, done, taskSelected }){
  return (
    <nav className="rail" aria-label="Katmanlar">
      <div className="brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="1" width="24" height="24" rx="5" fill="none" stroke="#B8862B" strokeWidth="1.5"/><path d="M7 8l6 11 6-11" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
        <div><b>VALUATOR</b><span>Firma değerleme motoru</span></div>
      </div>
      <ol className="layers">
        {LAYERS.map(l => {
          const locked = l.k !== 'L0' && !taskSelected;
          return (
          <li key={l.k}>
            <button className={'layer'+(done[l.k]?' ok':'')} aria-current={layer===l.k} disabled={locked} onClick={()=>!locked && setLayer(l.k)}>
              <span className="lc">{l.k}</span>
              <span><span className="ln">{l.n}</span><span className="lm">{l.m}</span></span>
            </button>
          </li>
          );
        })}
      </ol>
      <div className="rfoot">
        <div className="flow"><span>Girdi</span><i/><span>İşlem</span><i/><span>Çıktı</span></div>
      </div>
    </nav>
  );
}
