// English labels for the Tekdüzen tax-return-line table (engine/accounts.js, BS_ASSETS/BS_LIABS/lineOf).
// Shadow GAAP codes mirror Tekdüzen's numeric ranges, so lineOf(code)'s range matching is reused —
// only the Turkish labels are translated here, nothing else from accounts.js is duplicated.
import { lineOf } from './accounts.js';

export const SEC_EN = {
  'Dönen Varlıklar': 'Current assets',
  'Duran Varlıklar': 'Non-current assets',
  'Kısa Vadeli Yabancı Kaynaklar': 'Current liabilities',
  'Uzun Vadeli Yabancı Kaynaklar': 'Non-current liabilities',
  'Özkaynaklar': 'Equity',
  'Gelir Tablosu': 'Income statement',
  'Maliyet Hesapları': 'Cost accounts',
  'Serbest': 'Free',
  'Nazım Hesaplar': 'Off-balance accounts',
};

export const LINE_EN = {
  cash: 'Cash and equivalents', secs: 'Marketable securities', tradeRec: 'Trade receivables (net)',
  otherRec: 'Other receivables', inv: 'Inventories', advGiven: 'Advances given',
  constr: 'Long-term contract costs', prepaid: 'Prepaid expenses, accrued income', otherCA: 'Other current assets',
  ltRec: 'Trade receivables (long-term)', ltOtherRec: 'Other receivables (long-term)', finFA: 'Financial fixed assets',
  ppe: 'Property, plant & equipment (net)', ppeAdv: 'Advances given (PP&E)', intang: 'Intangible assets (net)',
  depl: 'Depletable assets', ltPrepaid: 'Prepaid expenses (long-term)', otherNCA: 'Other non-current assets',
  finDebtST: 'Financial liabilities', tradePay: 'Trade payables', partnersST: 'Due to shareholders',
  otherPayST: 'Other payables', advRecv: 'Advances received', constrPr: 'Long-term contract progress billings',
  taxPay: 'Taxes and other liabilities payable', provST: 'Provisions', defIncST: 'Deferred income, accrued expenses',
  otherSTL: 'Other current liabilities',
  finDebtLT: 'Financial liabilities (long-term)', tradePayLT: 'Trade payables (long-term)', partnersLT: 'Due to shareholders (long-term)',
  otherPayLT: 'Other payables (long-term)', advRecvLT: 'Advances received (long-term)', provLT: 'Provisions (long-term)',
  defIncLT: 'Deferred income, accrued expenses (long-term)', otherLTL: 'Other long-term liabilities',
  paidIn: 'Paid-in capital (incl. restatement)', capRes: 'Capital reserves', profitRes: 'Retained earnings reserves',
  prevProfit: "Prior years' profits", prevLoss: "Prior years' losses", netProfit: 'Net profit (loss) for the period',
  is: 'Income statement account', cost: 'Cost account (7/A)', free: 'Free account', memo: 'Off-balance account',
};

export function lineOfEn(code) {
  const m = lineOf(code);
  if (!m) return null;
  return { sec: SEC_EN[m.sec] || m.sec, line: { ...m.line, n: LINE_EN[m.line.k] || m.line.n } };
}
