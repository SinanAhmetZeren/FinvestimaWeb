import { nf, pc } from './ui.jsx';

export function RevenueChart({ data, h=210 }){
  // data: [{l, rev, margin, proj}]
  if (!data.length) return null;
  const W = 640, H = h, pl = 46, pr = 40, pt = 14, pb = 26;
  const maxR = Math.max(...data.map(d=>d.rev))*1.12 || 1;
  const maxM = Math.max(0.05, ...data.map(d=>d.margin||0))*1.25;
  const bw = (W-pl-pr)/data.length;
  const y = v => pt + (H-pt-pb)*(1 - v/maxR);
  const ym = v => pt + (H-pt-pb)*(1 - v/maxM);
  const ticks = [0, .25, .5, .75, 1].map(t=>t*maxR);
  const pts = data.map((d,i)=>[pl+bw*i+bw/2, ym(d.margin||0)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Ciro ve FAVÖK marjı">
      {ticks.map((t,i)=><g key={i}><line x1={pl} x2={W-pr} y1={y(t)} y2={y(t)} className="gl"/><text x={pl-6} y={y(t)+3} className="ax" textAnchor="end">{nf(t/1000,1)}</text></g>)}
      {data.map((d,i)=>(
        <g key={i}>
          <rect x={pl+bw*i+bw*0.18} y={y(d.rev)} width={bw*0.64} height={Math.max(0,y(0)-y(d.rev))} className={d.proj?'b-proj':'b-hist'} rx="2"/>
          <text x={pl+bw*i+bw/2} y={H-8} className="ax" textAnchor="middle">{d.l}</text>
        </g>
      ))}
      <polyline points={pts.map(p=>p.join(',')).join(' ')} className="ml"/>
      {pts.map((p,i)=><g key={i}><circle cx={p[0]} cy={p[1]} r="3.2" className="md"/><text x={p[0]} y={p[1]-7} className="mlab" textAnchor="middle">{pc(data[i].margin,1)}</text></g>)}
      <text x={pl} y={10} className="ax">M USD ciro</text>
      <text x={W-pr+4} y={10} className="ax">FAVÖK %</text>
    </svg>
  );
}

export function FootballField({ items, marker, h }){
  // items: [{l, lo, hi, mid}] ('000 USD özkaynak)
  const W = 640, rowH = 34, pl = 170, pr = 24, pt = 10, H = h || pt + items.length*rowH + 30;
  const all = items.flatMap(i=>[i.lo,i.hi,i.mid]).concat(marker!=null?[marker]:[]).filter(isFinite);
  let mn = Math.min(0, ...all), mxv = Math.max(...all)*1.08;
  if (!(mxv>mn)) mxv = mn+1;
  const x = v => pl + (W-pl-pr)*(v-mn)/(mxv-mn);
  const ticks = 5, tv = Array.from({length:ticks+1},(_,i)=>mn+(mxv-mn)*i/ticks);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Değer aralıkları">
      {tv.map((t,i)=><g key={i}><line x1={x(t)} x2={x(t)} y1={pt} y2={H-22} className="gl"/><text x={x(t)} y={H-8} className="ax" textAnchor="middle">{nf(t/1000,1)}</text></g>)}
      {items.map((it,i)=>{
        const yy = pt + i*rowH + 8;
        return (<g key={i}>
          <text x={pl-10} y={yy+12} className="flab" textAnchor="end">{it.l}</text>
          <rect x={x(Math.min(it.lo,it.hi))} y={yy} width={Math.max(3, Math.abs(x(it.hi)-x(it.lo)))} height="18" rx="3" className={'ff ff'+i}/>
          <line x1={x(it.mid)} x2={x(it.mid)} y1={yy-3} y2={yy+21} className="ffmid"/>
          <text x={x(Math.max(it.lo,it.hi))+6} y={yy+13} className="ax">{nf(it.mid/1000,1)}</text>
        </g>);
      })}
      {marker!=null && <g><line x1={x(marker)} x2={x(marker)} y1={pt-4} y2={H-22} className="mk"/><text x={x(marker)+4} y={H-26} className="mkl">Ağırlıklı {nf(marker/1000,1)}</text></g>}
      <text x={W-pr} y={pt+4} className="ax" textAnchor="end">M USD özkaynak</text>
    </svg>
  );
}

export function Bridge({ steps }){
  // steps: [{l, v, total?}]
  const W=640,H=200,pl=12,pr=12,pt=18,pb=34;
  let run=0; const bars=[];
  steps.forEach(s=>{ if (s.total){ bars.push({...s, a:0, b:s.v}); run=s.v; } else { bars.push({...s, a:run, b:run+s.v}); run+=s.v; } });
  const vals = bars.flatMap(b=>[b.a,b.b]); const mn=Math.min(0,...vals), mxv=Math.max(...vals)*1.1||1;
  const y=v=> pt+(H-pt-pb)*(1-(v-mn)/(mxv-mn)); const bw=(W-pl-pr)/bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Değer köprüsü">
      <line x1={pl} x2={W-pr} y1={y(0)} y2={y(0)} className="gl"/>
      {bars.map((b,i)=>(
        <g key={i}>
          <rect x={pl+bw*i+bw*.15} y={y(Math.max(b.a,b.b))} width={bw*.7} height={Math.max(1.5,Math.abs(y(b.a)-y(b.b)))} rx="2" className={b.total?'b-hist':(b.v<0?'b-neg':'b-proj')}/>
          <text x={pl+bw*i+bw/2} y={y(Math.max(b.a,b.b))-5} className="mlab" textAnchor="middle">{nf(b.v/1000,1)}</text>
          <text x={pl+bw*i+bw/2} y={H-18} className="ax" textAnchor="middle">{b.l}</text>
        </g>
      ))}
    </svg>
  );
}

export function MiniBars({ data, h=150 }){
  // aylık: [{l, v, v2}]
  if (!data.length) return null;
  const W=640,H=h,pl=40,pr=10,pt=10,pb=22;
  const mxv=Math.max(...data.map(d=>Math.max(d.v,d.v2||0)))*1.1||1, bw=(W-pl-pr)/data.length;
  const y=v=>pt+(H-pt-pb)*(1-v/mxv);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Aylık ciro">
      {[0,.5,1].map((t,i)=><g key={i}><line x1={pl} x2={W-pr} y1={y(t*mxv)} y2={y(t*mxv)} className="gl"/><text x={pl-5} y={y(t*mxv)+3} className="ax" textAnchor="end">{nf(t*mxv/1e6,0)}</text></g>)}
      {data.map((d,i)=><g key={i}>
        <rect x={pl+bw*i+bw*.12} y={y(d.v)} width={bw*.76} height={y(0)-y(d.v)} className={d.cur?'b-proj':'b-hist'} rx="1.5"/>
        {(i%3===0) && <text x={pl+bw*i+bw/2} y={H-6} className="ax" textAnchor="middle">{d.l}</text>}
      </g>)}
      <text x={pl} y={8} className="ax">M ₺</text>
    </svg>
  );
}
