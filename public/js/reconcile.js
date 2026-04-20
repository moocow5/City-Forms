/* ═══════════════════════════════════════
   Post-Trip Reconciliation — Client JS
   ═══════════════════════════════════════ */

const $ = (id) => document.getElementById(id);
const gv = (id) => { const el = $(id); return el ? el.value : ""; };
const sv = (id, v) => { const el = $(id); if (!el) return; if (el.tagName === "SPAN") el.textContent = v; else el.value = v; };
const pf = (v) => parseFloat(v) || 0;
const fmt = (n) => (isNaN(n) || n === 0) ? "" : n.toFixed(2);
const fmtMoney = (n) => isNaN(n) ? "—" : `$${n.toFixed(2)}`;

// ── Estimated values loaded from SP ──
const EST = {
  reg: 0, travel: 0, lodging: 0, mileage: 0,
  breakfast: 0, lunch: 0, supper: 0,
  other1: 0, other2: 0, total: 0
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
  sv("est_total",     EST.total     ? fmtMoney(EST.total)     : "—");
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

// ── Calc: Individual meal ──
function recalcMeal(meal) {
  const total = pf(gv(`${meal}IS2`)) * pf(gv(`${meal}ISRate2`))
              + pf(gv(`${meal}OS2`)) * pf(gv(`${meal}OSRate2`));
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
  };

  const total = Object.values(actuals).reduce((s, v) => s + v, 0);
  sv("totalExpense", fmt(total));
  sv("amountDue", fmt(total - pf(gv("amountPaid")) - pf(gv("advanceMoney2"))));

  // Update variance column
  setVariance("var_reg",       actuals.reg,       EST.reg);
  setVariance("var_travel",    actuals.travel,    EST.travel);
  setVariance("var_lodging",   actuals.lodging,   EST.lodging);
  setVariance("var_mileage",   actuals.mileage,   EST.mileage);
  setVariance("var_breakfast", actuals.breakfast, EST.breakfast);
  setVariance("var_lunch",     actuals.lunch,     EST.lunch);
  setVariance("var_supper",    actuals.supper,    EST.supper);
  setVariance("var_other1",    actuals.other1,    EST.other1);
  setVariance("var_other2",    actuals.other2,    EST.other2);
  setVariance("var_total",     total,             EST.total);
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
      "breakfastIS","breakfastISRate","breakfastOS","breakfastOSRate","breakfastTotal",
      "lunchIS","lunchISRate","lunchOS","lunchOSRate","lunchTotal",
      "supperIS","supperISRate","supperOS","supperOSRate","supperTotal",
      "other1Desc","other1Total","other2Desc","other2Total",
      "estimatedTotal","advanceMoney","deptHead","cityAdmin","approvalDate"
    ];
    s1Fields.forEach((key) => { if (fd[key]) sv(key, fd[key]); });

    // Pre-fill advance money in section-2
    if (fd.advanceMoney) sv("advanceMoney2", fd.advanceMoney);

    // Load estimated spans and reset variances
    loadEstimates(fd);
    recalcAll();

    $("tripSummaryCard").style.display = "";
    $("varianceCard").style.display = "";
    status.innerHTML = '<div class="toast toast-success">✓ Trip loaded. Enter actual expenses below.</div>';
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
    "breakfastIS","breakfastISRate","breakfastOS","breakfastOSRate","breakfastTotal",
    "lunchIS","lunchISRate","lunchOS","lunchOSRate","lunchTotal",
    "supperIS","supperISRate","supperOS","supperOSRate","supperTotal",
    "other1Desc","other1Total","other2Desc","other2Total",
    "estimatedTotal","advanceMoney","deptHead","cityAdmin","approvalDate"
  ];
  s1Fields.forEach((id) => {
    const el = $(id);
    if (el && el.value) formData[id] = el.value;
  });

  try {
    const res = await fetch("/api/generate-pdf", {
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
    "breakfastIS2","breakfastISRate2","breakfastOS2","breakfastOSRate2","breakfastTotal2",
    "lunchIS2","lunchISRate2","lunchOS2","lunchOSRate2","lunchTotal2",
    "supperIS2","supperISRate2","supperOS2","supperOSRate2","supperTotal2",
    "other1Desc2","other1Total2","other2Desc2","other2Total2",
    "totalExpense","amountPaid","advanceMoney2","amountDue","deptHead2"
  ];
  actualIds.forEach((id) => sv(id, ""));
  recalcAll();
  $("pdfStatus").innerHTML = "";
}

