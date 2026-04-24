/* ═══════════════════════════════════════
   Travel Expense Form — Client JS
   ═══════════════════════════════════════ */

// ── Helpers ──
const $ = (id) => document.getElementById(id);
const gv = (id) => { const el = $(id); return el ? el.value : ""; };
const sv = (id, v) => { const el = $(id); if (el) el.value = v; };
const pf = (v) => parseFloat(v) || 0;
const fmt = (n) => (isNaN(n) || n === 0) ? "" : n.toFixed(2);

// ── Auto-calc: Lodging ──
function calcLodging() {
  sv("lodgingTotal", fmt(pf(gv("lodgingNights")) * pf(gv("lodgingRate"))));
  calcTotal();
}

// ── Auto-calc: Mileage ──
function calcMileage() {
  sv("mileageTotal", fmt(pf(gv("mileageMiles")) * pf(gv("mileageRate"))));
  calcTotal();
}

// ── Auto-calc: Meals ──
function calcMeal(meal) {
  sv(`${meal}Total`, fmt(
    pf(gv(`${meal}IS`)) * pf(gv(`${meal}ISRate`)) +
    pf(gv(`${meal}OS`)) * pf(gv(`${meal}OSRate`))
  ));
  calcTotal();
}

// ── Totals ──
function calcTotal() {
  const keys = ["regCheck", "travelCheck", "lodgingTotal", "mileageTotal",
    "breakfastTotal", "lunchTotal", "supperTotal",
    "other1Total", "other2Total", "other3Total", "other4Total", "other5Total"];
  sv("estimatedTotal", fmt(keys.reduce((s, k) => s + pf(gv(k)), 0)));
}

function recalcAll() {
  calcLodging();
  calcMileage();
  ["breakfast", "lunch", "supper"].forEach((m) => calcMeal(m));
  calcTotal();
}

// ── Wire up oninput handlers ──
document.addEventListener("DOMContentLoaded", () => {
  // Lodging
  ["lodgingNights", "lodgingRate"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", calcLodging);
  });

  // Mileage
  ["mileageMiles", "mileageRate"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", calcMileage);
  });

  // Meals
  ["breakfast", "lunch", "supper"].forEach((meal) => {
    ["IS", "ISRate", "OS", "OSRate"].forEach((sfx) => {
      const el = $(meal + sfx); if (el) el.addEventListener("input", () => calcMeal(meal));
    });
  });

  // Direct totals
  ["regCheck", "travelCheck", "other1Total", "other2Total", "other3Total", "other4Total", "other5Total"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", calcTotal);
  });
});

// ── SP panel toggle ──
function toggleSP() {
  const body = $("spBody");
  const chev = $("spChevron");
  body.classList.toggle("open");
  chev.classList.toggle("open");
}

// ── SP item preview ──
async function previewItem() {
  const sel = $("spItemSelect");
  const preview = $("spPreview");
  if (!sel.value) { preview.classList.remove("visible"); return; }

  preview.innerHTML = '<div class="toast toast-info">Loading...</div>';
  preview.classList.add("visible");

  try {
    const res = await fetch(`/api/items/${sel.value}/form-data`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const fd = data.formData;
    const html = Object.entries(fd)
      .filter(([, v]) => v)
      .map(([k, v]) => `<div class="field-row"><span class="field-name">${k}</span><span class="field-val">${v}</span></div>`)
      .join("");
    preview.innerHTML = html || '<div style="color:var(--gray-400)">No data</div>';
  } catch (err) {
    preview.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Track the currently loaded SP item id ──
let _loadedItemId = null;

// ── Pull SP data into form ──
async function pullIntoForm() {
  const sel = $("spItemSelect");
  const status = $("spStatus");
  if (!sel.value) {
    _loadedItemId = null;
    const btn = $("btnUpdate"); if (btn) { btn.disabled = true; btn.title = "Load a request from SharePoint first"; }
    status.innerHTML = '';
    return;
  }

  status.innerHTML = '<div class="toast toast-info">Loading...</div>';
  try {
    const res = await fetch(`/api/items/${sel.value}/form-data`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const fd = data.formData;
    let filled = 0;
    Object.entries(fd).forEach(([key, val]) => {
      if (val) { sv(key, val); filled++; }
    });
    recalcAll();

    _loadedItemId = sel.value;
    const btn = $("btnUpdate"); if (btn) { btn.disabled = false; btn.title = ""; }
    status.innerHTML = `<div class="toast toast-success">✓ Loaded ${filled} fields. Totals recalculated.</div>`;
  } catch (err) {
    status.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Collect all form field values ──
function collectFormData() {
  const data = {};
  document.querySelectorAll("[data-field]").forEach((el) => { data[el.id] = el.value; });
  return data;
}

// ── Save as new SP list item ──
async function saveNewRequest() {
  const status = $("saveStatus");
  if (!$("purpose") || !$("purpose").value.trim()) {
    status.innerHTML = '<div class="toast toast-error">Purpose of Travel is required before saving.</div>';
    return;
  }
  status.innerHTML = '<div class="toast toast-info">Saving new request...</div>';
  try {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectFormData()),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    _loadedItemId = data.id;
    const btn = $("btnUpdate"); if (btn) { btn.disabled = false; btn.title = ""; }
    status.innerHTML = `<div class="toast toast-success">✓ Request saved to SharePoint (ID: ${data.id}).</div>`;
  } catch (err) {
    status.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Update existing SP list item ──
async function updateRequest() {
  const status = $("saveStatus");
  if (!_loadedItemId) return;
  status.innerHTML = '<div class="toast toast-info">Updating request...</div>';
  try {
    const res = await fetch(`/api/items/${_loadedItemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectFormData()),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    status.innerHTML = '<div class="toast toast-success">✓ Request updated in SharePoint.</div>';
  } catch (err) {
    status.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Generate PDF ──
async function generatePDF() {
  const status = $("pdfStatus");
  status.innerHTML = '<div class="toast toast-info">Generating PDF...</div>';

  // Gather all form field values
  const fields = document.querySelectorAll("[data-field]");
  const formData = {};
  fields.forEach((el) => { formData[el.id] = el.value; });

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
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "Travel_Expense.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    status.innerHTML = '<div class="toast toast-success">✓ PDF downloaded.</div>';
  } catch (err) {
    status.innerHTML = `<div class="toast toast-error">${err.message}</div>`;
  }
}

// ── Start a new blank request ──
function startNewRequest() {
  clearForm();
  const sel = $("spItemSelect"); if (sel) sel.value = "";
  const dept = $("department");
  if (dept) { dept.focus(); dept.scrollIntoView({ behavior: "smooth", block: "center" }); }
}

// ── Clear form ──
function clearForm() {
  document.querySelectorAll("[data-field]").forEach((el) => { el.value = ""; });
  $("pdfStatus").innerHTML = "";
  $("saveStatus").innerHTML = "";
  _loadedItemId = null;
  const btn = $("btnUpdate"); if (btn) { btn.disabled = true; btn.title = "Load a request from SharePoint first"; }
}
