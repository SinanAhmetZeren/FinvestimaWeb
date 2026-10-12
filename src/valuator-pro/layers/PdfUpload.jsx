import { useState, useRef, useEffect } from 'react';
import { useStartExtractionJobMutation, useLazyGetExtractionJobQuery } from '../../slices/AiSlice';
import { loadPdf, renderPdfPageToCanvas, imageFileToCanvas, analyzeCropSuggestion } from '../../lib/pdfPreview';
import { CropConfirmation } from '../../pages/Extract.jsx';

// Extract sekmesiyle aynı akış: yükle → önizle → sayfa seç / kırp → gönder. Backend tarafı da
// aynı (AiController'ın extract-financials uçları), yeni bir şey kurulmadı. Tek fark: sonuç,
// mevcut beyanname kalem eşleme ekranına (st.pdfDocs → L2Mapping) besleniyor, ayrı bir tablo
// göstermiyoruz.

function canvasToBase64(canvas) { return canvas.toDataURL('image/png').split(',')[1]; }
const POLL_INTERVAL_MS = 2000;

export function PdfUpload({ up, log }) {
  const [startExtractionJob] = useStartExtractionJobMutation();
  const [fetchJob] = useLazyGetExtractionJobQuery();
  const [file, setFile] = useState(null);
  const [cropState, setCropState] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const pollTimeoutRef = useRef(null);
  const pdfDocRef = useRef(null);

  useEffect(() => () => { if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current); }, []);

  async function handleFileChange(e) {
    const selected = e.target.files[0];
    e.target.value = '';
    if (!selected) return;
    setFile(selected);
    setCropState(null);
    pdfDocRef.current = null;
    await handleUploadAndPreview(selected);
  }

  async function handleUploadAndPreview(f) {
    setIsLoadingPreview(true);
    try {
      const isPdf = f.name.toLowerCase().endsWith('.pdf');
      let canvas, pageCount = 1;
      if (isPdf) {
        const pdfDoc = await loadPdf(f);
        pdfDocRef.current = pdfDoc;
        pageCount = pdfDoc.numPages;
        canvas = await renderPdfPageToCanvas(pdfDoc, 1);
      } else {
        pdfDocRef.current = null;
        canvas = await imageFileToCanvas(f);
      }
      const { topPercent, bottomPercent } = analyzeCropSuggestion(canvas);
      setCropState({
        previewImageBase64: canvasToBase64(canvas),
        topPercent, bottomPercent, leftPercent: 2, rightPercent: 2,
        pageCount, previewPage: 1, pagesInput: '',
      });
    } catch (e) {
      console.error(e);
      log(`${f.name}: önizleme hazırlanamadı. ${e.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function handleViewPage(pageNum) {
    if (!pdfDocRef.current) return;
    try {
      const canvas = await renderPdfPageToCanvas(pdfDocRef.current, pageNum);
      setCropState(prev => prev ? { ...prev, previewImageBase64: canvasToBase64(canvas), previewPage: pageNum } : prev);
    } catch (e) { console.error(e); }
  }

  function handleCropChange(patch) { setCropState(prev => prev ? { ...prev, ...patch } : prev); }

  // Gemini'nin genel statement/row çıktısını, mevcut beyanname eşleme ekranının (L2Mapping)
  // beklediği items şekline çevirir — code hep null (kullanıcı kendisi eşler), tıpkı eski
  // client-side parser'ın unmapped bıraktığı kalemler gibi.
  function ingestResult(result, fileName) {
    const items = [];
    let year = null;
    for (const statement of (result?.statements || [])) {
      for (const row of statement.rows) {
        if (row.rowType === 'title') continue;
        const vals = row.values || [];
        const cur = vals.length ? vals[vals.length - 1] : null;
        const prev = vals.length > 1 ? vals[vals.length - 2] : null;
        items.push({ page: 1, label: row.label, cur, prev, code: null, kind: row.rowType === 'sum' ? 'subtotal' : 'unmapped' });
      }
      if (!year) {
        const m = (statement.columns || []).join(' ').match(/20\d{2}/);
        if (m) year = +m[0];
      }
    }
    const twoCols = items.some(i => i.prev != null);
    const doc = { id: 'P' + Math.random().toString(36).slice(2, 8), fileName, year, items, twoCols, usePrev: false, totals: {}, pages: 1 };
    up(s => ({ pdfDocs: [...s.pdfDocs, doc] }));
    log(`${fileName}: beyanname Gemini ile okundu, ${items.length} kalem çıkarıldı${year ? '' : '; yıl bulunamadı, L1\'de girin'}.`);
  }

  async function pollJob(jobId, fileName) {
    try {
      const job = await fetchJob(jobId).unwrap();
      if (job.status === 'Completed') {
        setIsProcessing(false);
        ingestResult(job.result, fileName);
        return;
      }
      if (job.status === 'Failed') {
        setIsProcessing(false);
        log(`${fileName}: ${job.errorMessage || 'Gemini işlemi başarısız oldu.'}`);
        return;
      }
      pollTimeoutRef.current = setTimeout(() => pollJob(jobId, fileName), POLL_INTERVAL_MS);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      log(`${fileName}: iş sorgulanamadı.`);
    }
  }

  async function handleProcessDocument() {
    if (!file || !cropState) return;
    setIsProcessing(true);
    const { topPercent, bottomPercent, leftPercent, rightPercent, pagesInput } = cropState;
    setCropState(null);
    try {
      const { jobId } = await startExtractionJob({ file, topPercent, bottomPercent, leftPercent, rightPercent, pages: pagesInput || null }).unwrap();
      pollTimeoutRef.current = setTimeout(() => pollJob(jobId, file.name), POLL_INTERVAL_MS);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      log(`${file.name}: gönderilemedi.`);
    }
  }

  const sendButton = (
    <button type="button" className="btn" onClick={handleProcessDocument} disabled={isProcessing}>
      {isProcessing ? 'Gönderiliyor…' : 'Dosyayı Gönder'}
    </button>
  );

  return (
    <div>
      <div className={'drop' + (isLoadingPreview ? ' busy' : '')} onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}>
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M17 23V7m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 21v5a2 2 0 002 2h18a2 2 0 002-2v-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        <b>{isLoadingPreview ? 'Önizleme hazırlanıyor…' : "PDF dosyasını seçmek için tıklayın"}</b>
        <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" hidden onChange={handleFileChange} />
      </div>

      {cropState && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,28,51,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, width: 'min(900px, 92vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)', position: 'relative' }}>
            <button type="button" onClick={() => { setCropState(null); setFile(null); }} aria-label="Kapat"
              style={{ position: 'absolute', top: 10, right: 12, border: 0, background: 'none', fontSize: 20, lineHeight: 1, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
            <CropConfirmation
              previewImageBase64={cropState.previewImageBase64}
              topPercent={cropState.topPercent}
              bottomPercent={cropState.bottomPercent}
              leftPercent={cropState.leftPercent}
              rightPercent={cropState.rightPercent}
              pageCount={cropState.pageCount}
              previewPage={cropState.previewPage}
              isLoadingPreview={isLoadingPreview}
              onViewPage={handleViewPage}
              pagesInput={cropState.pagesInput}
              onChange={handleCropChange}
              midSlot={cropState.pageCount > 1 ? sendButton : null}
            />
            {cropState.pageCount <= 1 && (
              <div style={{ textAlign: 'center', padding: '0 0 20px' }}>{sendButton}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
