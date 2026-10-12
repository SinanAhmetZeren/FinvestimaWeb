// Backend (Gemini-powered) trial balance extraction client. Replaces the client-side Excel
// mizan parser (see parseExcel.js, now unused for mizan — kept commented out in
// ValuatorProEngine.jsx for reversibility).

const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:5192"
  : "https://api.finvestima.com";

function authHeaders(){
  const token = localStorage.getItem("storedToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Uploads a file for extraction. Pass valuationTaskId to add to an existing task, or
// companyName/taskTitle to create a new one. Returns { jobId, valuationTaskId }.
export async function uploadTrialBalance(file, { valuationTaskId, companyName, taskTitle, maxCodeDigits } = {}){
  const form = new FormData();
  form.append('file', file);
  if (valuationTaskId) form.append('valuationTaskId', valuationTaskId);
  if (companyName) form.append('companyName', companyName);
  if (taskTitle) form.append('taskTitle', taskTitle);
  if (maxCodeDigits) form.append('maxCodeDigits', maxCodeDigits);

  const res = await fetch(`${API_URL}/api/ValuatorPro/upload-trial-balance`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Yükleme başarısız (${res.status}).`);
  return res.json();
}

async function getJob(jobId){
  const res = await fetch(`${API_URL}/api/ValuatorPro/upload-trial-balance/${jobId}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`İş sorgulanamadı (${res.status}).`);
  return res.json();
}

// Polls a job until it's Completed or Failed. Throws on Failed or timeout.
// onTick(job) is called on every poll (including the first) so the caller can reflect
// live status (Pending/Processing/Completed/Failed) in the UI.
export async function pollJob(jobId, { intervalMs = 1500, timeoutMs = 120000, onTick } = {}){
  const start = Date.now();
  while (Date.now() - start < timeoutMs){
    const job = await getJob(jobId);
    onTick?.(job);
    if (job.status === 'Completed') return job;
    if (job.status === 'Failed') throw new Error(job.errorMessage || 'Gemini işlemi başarısız oldu.');
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('İşlem zaman aşımına uğradı.');
}

// Kullanıcının mizan ızgarasında elle düzelttiği bir hesabı kaydeder — eski satırın üzerine
// yazmaz, yeni bir versiyon olarak eklenir (en son CreatedAt kazanır).
export async function editTrialBalanceAccount({ valuationTaskId, year, code, name, debit, credit }){
  const res = await fetch(`${API_URL}/api/ValuatorPro/trial-balance-accounts/manual-edit`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ valuationTaskId, year, code, name, debit, credit }),
  });
  if (!res.ok) throw new Error(`Kayıt başarısız (${res.status}).`);
  return res.json();
}

export async function getValuationTask(valuationTaskId){
  const res = await fetch(`${API_URL}/api/ValuatorPro/valuation-tasks/${valuationTaskId}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Değerleme verisi alınamadı (${res.status}).`);
  return res.json();
}
