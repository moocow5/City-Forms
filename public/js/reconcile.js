/* ═══════════════════════════════════════
   Post-Trip Reconciliation — Client JS
   ═══════════════════════════════════════ */

const $ = (id) => document.getElementById(id);
const gv = (id) => { const el = $(id); return el ? el.value : ""; };
const sv = (id, v) => { const el = $(id); if (!el) return; if (el.tagName === "SPAN") el.textContent = v; else el.value = v; };
const pf = (v) => parseFloat(v) || 0;
const fmt = (n) => (isNaN(n) || n === 0) ? "" : n.toFixed(2);
const fmtMoney = (n) => isNaN(n) ? "—" : `$${n.toFixed(2)}`;

// ── PO lines that flow into Less: Amounts Paid Direct ──
const NON_MEAL_PO_LINES = [
  { po: 'regPO',    amt: () => pf(gv('reg2')) },
  { po: 'travelPO', amt: () => pf(gv('travel2')) },
  { po: 'lodgingPO',amt: () => pf(gv('lodgingTotal2')) },
  { po: 'mileagePO',amt: () => pf(gv('mileageTotal2')) },
  { po: 'other1PO', amt: () => pf(gv('other1Total2')) },
  { po: 'other2PO', amt: () => pf(gv('other2Total2')) },
  { po: 'other3PO', amt: () => pf(gv('other3Total2')) },
  { po: 'other4PO', amt: () => pf(gv('other4Total2')) },
  { po: 'other5PO', amt: () => pf(gv('other5Total2')) },
];

// ── Meal PO lines flow into Less: Advance Money ──
const MEAL_PO_LINES = [
  { po: 'breakfastPO', amt: () => pf(gv('breakfastTotal2')) },
  { po: 'lunchPO',     amt: () => pf(gv('lunchTotal2')) },
  { po: 'supperPO',    amt: () => pf(gv('supperTotal2')) },
];

// ── Estimated values loaded from SP ──
const EST = {
  reg: 0, travel: 0, lodging: 0, mileage: 0,
  breakfast: 0, lunch: 0, supper: 0,
  other1: 0, other2: 0, other3: 0, other4: 0, other5: 0, total: 0
};

// ── Load estimated display spans ──
function loadEstimates(fd) {
  EST.reg       = pf(fd.regCheck);
  EST.travel    = pf(fd.travelCheck);
  EST.lodging   = pf(fd.lodgingTotal);
  EST.mileage   = pf(fd.mileageTotal);
  EST.breakfast = pf(fd.breakfastTotal);
  EST.lunch     = pf(fd.lunchTotal);
  EST.supper    = pf(fd.supperTotal);
  EST.other1    = pf(fd.other1Total);
  EST.other2    = pf(fd.other2Total);
  EST.other3    = pf(fd.other3Total);
  EST.other4    = pf(fd.other4Total);
  EST.other5    = pf(fd.other5Total);
  EST.total     = pf(fd.estimatedTotal);

  sv("est_reg",       EST.reg       ? fmtMoney(EST.reg)       : "—");
  sv("est_travel",    EST.travel    ? fmtMoney(EST.travel)    : "—");
  sv("est_lodging",   EST.lodging   ? fmtMoney(EST.lodging)   : "—");
  sv("est_mileage",   EST.mileage   ? fmtMoney(EST.mileage)   : "—");
  sv("est_breakfast", EST.breakfast ? fmtMoney(EST.breakfast) : "—");
  sv("est_lunch",     EST.lunch     ? fmtMoney(EST.lunch)     : "—");
  sv("est_supper",    EST.supper    ? fmtMoney(EST.supper)    : "—");
  sv("est_other1",    EST.other1    ? fmtMoney(EST.other1)    : "—");
  sv("est_other2",    EST.other2    ? fmtMoney(EST.other2)    : "—");
  sv("est_other3",    EST.other3    ? fmtMoney(EST.other3)    : "—");
  sv("est_other4",    EST.other4    ? fmtMoney(EST.other4)    : "—");
  sv("est_other5",    EST.other5    ? fmtMoney(EST.other5)    : "—");
  sv("est_total",     EST.total     ? fmtMoney(EST.total)     : "—");
}

// ── Copy meal per diem values into section-2 fields; counts become editable defaults ──
function copyMealPerDiem(fd) {
  ["breakfast", "lunch", "supper"].forEach((meal) => {
    // Always copy rate (hidden, used for calculation)
    sv(`${meal}Rate2`, fd[`${meal}Rate`] || "");
    // Only default count from original request if not already set by saved reconciliation data
    if (!gv(`${meal}2`)) sv(`${meal}2`, fd[meal] || "");
    // Compute and store total from whatever count is now set
    const total = pf(gv(`${meal}2`)) * pf(fd[`${meal}Rate`]);
    sv(`${meal}Total2`, fmt(total));
    updateMealRateDisplay(meal, fd);
  });
}

// ── Update the rate label span shown beside count input ──
function updateMealRateDisplay(meal, fd) {
  const rate = pf(fd ? fd[`${meal}Rate`] : gv(`${meal}Rate2`));
  const el = $(`meal_${meal}_rate`);
  if (el) el.textContent = rate ? `×$${rate.toFixed(2)}` : "";
}

// ── innerHTML helper for span elements ──
function setSpan(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setVariance(spanId, actual, estimated) {
  const el = $(spanId);
  if (!el) return;
  if (!actual && !estimated) { el.textContent = "—"; el.className = "var-zero"; return; }
  const diff = actual - estimated;
  el.textContent = (diff >= 0 ? "+" : "") + fmtMoney(diff);
  el.className = diff > 0 ? "var-over" : diff < 0 ? "var-under" : "var-zero";
}

// ── Calc: Lodging ──
function recalcLodging() {
  const total = pf(gv("lodgingNights2")) * pf(gv("lodgingRate2"));
  sv("lodgingTotal2", fmt(total));
  recalcAll();
}

// ── Calc: Mileage ──
function recalcMileage() {
  const total = pf(gv("mileageMiles2")) * pf(gv("mileageRate2"));
  sv("mileageTotal2", fmt(total));
  recalcAll();
}

// ── Calc: individual meal (count editable, rate fixed from request) ──
function recalcMeal(meal) {
  const total = pf(gv(`${meal}2`)) * pf(gv(`${meal}Rate2`));
  sv(`${meal}Total2`, fmt(total));
  recalcAll();
}

// ── Recalc everything ──
function recalcAll() {
  const actuals = {
    reg:       pf(gv("reg2")),
    travel:    pf(gv("travel2")),
    lodging:   pf(gv("lodgingTotal2")),
    mileage:   pf(gv("mileageTotal2")),
    breakfast: pf(gv("breakfastTotal2")),
    lunch:     pf(gv("lunchTotal2")),
    supper:    pf(gv("supperTotal2")),
    other1:    pf(gv("other1Total2")),
    other2:    pf(gv("other2Total2")),
    other3:    pf(gv("other3Total2")),
    other4:    pf(gv("other4Total2")),
    other5:    pf(gv("other5Total2")),
  };

  const total = Object.values(actuals).reduce((s, v) => s + v, 0);
  sv("totalExpense", fmt(total));

  const amtPaid = NON_MEAL_PO_LINES.reduce((s, r) => gv(r.po) ? s + r.amt() : s, 0);
  sv('amountPaid', amtPaid ? fmt(amtPaid) : '');

  const mealPOTotal = MEAL_PO_LINES.reduce((s, r) => gv(r.po) ? s + r.amt() : s, 0);
  const baseAdvance = pf(gv('advanceMoney'));
  const totalAdvance = baseAdvance + mealPOTotal;
  sv('advanceMoney2', totalAdvance ? fmt(totalAdvance) : '');

  sv('amountDue', fmt(total - amtPaid - totalAdvance));

  setVariance("var_reg",       actuals.reg,       EST.reg);
  setVariance("var_travel",    actuals.travel,     EST.travel);
  setVariance("var_lodging",   actuals.lodging,    EST.lodging);
  setVariance("var_mileage",   actuals.mileage,    EST.mileage);
  setVariance("var_breakfast", actuals.breakfast,  EST.breakfast);
  setVariance("var_lunch",     actuals.lunch,      EST.lunch);
  setVariance("var_supper",    actuals.supper,     EST.supper);
  setVariance("var_other1",    actuals.other1,     EST.other1);
  setVariance("var_other2",    actuals.other2,     EST.other2);
  setVariance("var_other3",    actuals.other3,     EST.other3);
  setVariance("var_other4",    actuals.other4,     EST.other4);
  setVariance("var_other5",    actuals.other5,     EST.other5);
  setVariance("var_total",     total,              EST.total);
}

// ── Loaded item tracking ──
let _loadedItemId = null;

function enableSaveBtn(on) {
  const btn = $("btnSaveRecon");
  if (!btn) return;
  btn.disabled = !on;
  btn.title = on ? "" : "Load a trip first";
}

// ── SP panel toggle ──
function toggleSP() {
  const body = $("spBody");
  const chev = $("spChevron");
  body.classList.toggle("open");
  chev.classList.toggle("open");
}

// ── Pull SP data into form ──
async function pullIntoForm() {
  const sel = $("spItemSelect");
  const status = $("spStatus");
  if (!sel.value) {
    _loadedItemId = null;
    enableSaveBtn(false);
    $("tripSummaryCard").style.display = "none";
    $("varianceCard").style.display = "none";
    status.innerHTML = "";
    return;
  }

  status.innerHTML = '<div class="toast toast-info">Loading...</div>';
  try {
    const res = await fetch(`/api/items/${sel.value}/form-data`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const fd = data.formData;

    // Populate read-only trip summary
    sv("department",   fd.department   || "");
    sv("employeeName", fd.employeeName || "");
    sv("fromDate",     fd.fromDate     || "");
    sv("toDate",       fd.toDate       || "");
    sv("purpose",      fd.purpose      || "");
    sv("location",     fd.location     || "");
    sv("empSigDisplay", fd.employeeName || "");

    // Populate hidden section-1 fields (for PDF generation)
    const s1Fields = [
      "fromTime","toTime","purpose2",
      "regCheck","travelCheck",
      "lodgingNights","lodgingRate","lodgingTotal",
      "mileageMiles","mileageRate","mileageTotal",
      "breakfast","breakfastRate","breakfastTotal",
      "lunch","lunchRate","lunchTotal",
      "supper","supperRate","supperTotal",
      "other1Desc","other1Total","other2Desc","other2Total",
      "other3Desc","other3Total","other4Desc","other4Total","other5Desc","other5Total",
      "estimatedTotal","advanceMoney","deptHead","cityAdmin","approvalDate"
    ];
    s1Fields.forEach((key) => { if (fd[key]) sv(key, fd[key]); });

    // Pre-fill advance money in section-2 (from request, overridden by saved reconciliation below)
    if (fd.advanceMoney) sv("advanceMoney2", fd.advanceMoney);

    // Populate saved reconciliation actuals if they exist
    const reconFields = [
      "reg2","travel2","lodgingNights2","lodgingRate2","lodgingTotal2",
      "mileageMiles2","mileageRate2","mileageTotal2",
      "breakfast2","breakfastRate2","breakfastTotal2",
      "lunch2","lunchRate2","lunchTotal2",
      "supper2","supperRate2","supperTotal2",
      "other1Desc2","other1Total2","other2Desc2","other2Total2",
      "other3Desc2","other3Total2","other4Desc2","other4Total2","other5Desc2","other5Total2",
      "regPO","travelPO","lodgingPO","mileagePO",
      "breakfastPO","lunchPO","supperPO",
      "other1PO","other2PO","other3PO","other4PO","other5PO",
      "amountPaid","advanceMoney2","deptHead2"
    ];
    reconFields.forEach((key) => { if (fd[key]) sv(key, fd[key]); });

    // Load estimated spans, copy per diem meals (counts pre-fill from request, editable), recalc
    loadEstimates(fd);
    copyMealPerDiem(fd);
    recalcAll();

    _loadedItemId = sel.value;
    enableSaveBtn(true);
    $("tripSummaryCard").style.display = "";
    $("varianceCard").style.display = "";
    const hasRecon = fd.reg2 || fd.travel2 || fd.lodgingTotal2 || fd.mileageTotal2;
    status.innerHTML = hasRecon
      ? '<div class="toast toast-success">✓ Trip loaded with saved reconciliation data.</div>'
      : '<div class="toast toast-success">✓ Trip loaded. Enter actual expenses below.</div>';
  } catch (err) {
    status.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Save reconciliation to SharePoint ──
async function saveReconciliation() {
  const status = $("saveReconcileStatus");
  if (!_loadedItemId) return;
  status.innerHTML = '<div class="toast toast-info">Saving reconciliation...</div>';

  const formData = {};
  document.querySelectorAll("[data-field]").forEach((el) => { formData[el.id] = el.value; });

  try {
    const res = await fetch(`/api/items/${_loadedItemId}/reconcile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    status.innerHTML = '<div class="toast toast-success">✓ Reconciliation saved to SharePoint.</div>';
  } catch (err) {
    status.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Generate PDF ──
async function generatePDF() {
  const status = $("pdfStatus");
  status.innerHTML = '<div class="toast toast-info">Generating PDF...</div>';

  // Collect all data-field inputs (section-2 actuals)
  const formData = {};
  document.querySelectorAll("[data-field]").forEach((el) => {
    formData[el.id] = el.value;
  });

  // Also include hidden section-1 fields
  const s1Fields = [
    "department","employeeName","fromDate","toDate","fromTime","toTime",
    "purpose","purpose2","location",
    "regCheck","travelCheck",
    "lodgingNights","lodgingRate","lodgingTotal",
    "mileageMiles","mileageRate","mileageTotal",
    "breakfast","breakfastRate","breakfastTotal",
    "lunch","lunchRate","lunchTotal",
    "supper","supperRate","supperTotal",
    "other1Desc","other1Total","other2Desc","other2Total",
    "other3Desc","other3Total","other4Desc","other4Total","other5Desc","other5Total",
    "estimatedTotal","advanceMoney","deptHead","cityAdmin","approvalDate"
  ];
  s1Fields.forEach((id) => {
    const el = $(id);
    if (el && el.value) formData[id] = el.value;
  });

  try {
    const res = await fetch("/api/generate-reconcile-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "PDF generation failed");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "Travel_Reconciliation.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    status.innerHTML = '<div class="toast toast-success">✓ Reconciliation PDF downloaded.</div>';
  } catch (err) {
    status.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Clear actuals only ──
function clearActuals() {
  const actualIds = [
    "reg2","travel2","lodgingNights2","lodgingRate2","lodgingTotal2",
    "mileageMiles2","mileageRate2","mileageTotal2",
    "breakfast2","breakfastRate2","breakfastTotal2",
    "lunch2","lunchRate2","lunchTotal2",
    "supper2","supperRate2","supperTotal2",
    "other1Desc2","other1Total2","other2Desc2","other2Total2",
    "other3Desc2","other3Total2","other4Desc2","other4Total2","other5Desc2","other5Total2",
    "regPO","travelPO","lodgingPO","mileagePO",
    "breakfastPO","lunchPO","supperPO",
    "other1PO","other2PO","other3PO","other4PO","other5PO",
    "totalExpense","amountPaid","advanceMoney2","amountDue","deptHead2"
  ];
  actualIds.forEach((id) => sv(id, ""));
  // Clear rate display labels
  ["breakfast","lunch","supper"].forEach((meal) => {
    const el = $(`meal_${meal}_rate`); if (el) el.textContent = "";
  });
  recalcAll();
  $("pdfStatus").innerHTML = "";
}

// ── Format editable currency fields to 2 decimal places on blur ──
['reg2','travel2','other1Total2','other2Total2','other3Total2','other4Total2','other5Total2']
  .forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      const n = parseFloat(el.value);
      if (!isNaN(n) && n !== 0) el.value = n.toFixed(2);
    });
  });
