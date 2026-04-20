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
function calcLodging(prefix) {
  const nights = pf(gv(`${prefix}Nights`));
  const rate = pf(gv(`${prefix}Rate`));
  sv(`${prefix}Total`, fmt(nights * rate));
  calcTotal(prefix.includes("2") ? "expense" : "prepaid");
}

// ── Auto-calc: Mileage ──
function calcMileage(prefix) {
  const miles = pf(gv(`${prefix}Miles`));
  const rate = pf(gv(`${prefix}Rate`));
  sv(`${prefix}Total`, fmt(miles * rate));
  calcTotal(prefix.includes("2") ? "expense" : "prepaid");
}

// ── Auto-calc: Meals ──
function calcMeal(meal, section) {
  const sfx = section === 2 ? "2" : "";
  const isCount = pf(gv(`${meal}IS${sfx}`));
  const isRate = pf(gv(`${meal}ISRate${sfx}`));
  const osCount = pf(gv(`${meal}OS${sfx}`));
  const osRate = pf(gv(`${meal}OSRate${sfx}`));
  sv(`${meal}Total${sfx}`, fmt(isCount * isRate + osCount * osRate));
  calcTotal(section === 2 ? "expense" : "prepaid");
}

// ── Totals ──
function calcTotal(which) {
  if (which === "prepaid") {
    const keys = ["regCheck", "travelCheck", "lodgingTotal", "mileageTotal",
      "breakfastTotal", "lunchTotal", "supperTotal", "other1Total", "other2Total"];
    const sum = keys.reduce((s, k) => s + pf(gv(k)), 0);
    sv("estimatedTotal", fmt(sum));
  } else {
    const keys = ["reg2", "travel2", "lodgingTotal2", "mileageTotal2",
      "breakfastTotal2", "lunchTotal2", "supperTotal2", "other1Total2", "other2Total2"];
    const sum = keys.reduce((s, k) => s + pf(gv(k)), 0);
    sv("totalExpense", fmt(sum));
    sv("amountDue", fmt(sum - pf(gv("amountPaid")) - pf(gv("advanceMoney2"))));
  }
}

function recalcAll() {
  calcLodging("lodging"); calcLodging("lodging2");
  calcMileage("mileage"); calcMileage("mileage2");
  ["breakfast", "lunch", "supper"].forEach((m) => { calcMeal(m, 1); calcMeal(m, 2); });
  calcTotal("prepaid"); calcTotal("expense");
}

// ── Wire up oninput handlers ──
document.addEventListener("DOMContentLoaded", () => {
  // Lodging
  ["lodgingNights", "lodgingRate"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", () => calcLodging("lodging"));
  });
  ["lodgingNights2", "lodgingRate2"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", () => calcLodging("lodging2"));
  });

  // Mileage
  ["mileageMiles", "mileageRate"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", () => calcMileage("mileage"));
  });
  ["mileageMiles2", "mileageRate2"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", () => calcMileage("mileage2"));
  });

  // Meals
  const mealFields = ["IS", "ISRate", "OS", "OSRate"];
  ["breakfast", "lunch", "supper"].forEach((meal) => {
    mealFields.forEach((sfx) => {
      const el1 = $(meal + sfx); if (el1) el1.addEventListener("input", () => calcMeal(meal, 1));
      const el2 = $(meal + sfx + "2"); if (el2) el2.addEventListener("input", () => calcMeal(meal, 2));
    });
  });

  // Direct totals that feed into prepaid/expense
  ["regCheck", "travelCheck", "other1Total", "other2Total"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", () => calcTotal("prepaid"));
  });
  ["reg2", "travel2", "other1Total2", "other2Total2", "amountPaid", "advanceMoney2"].forEach((id) => {
    const el = $(id); if (el) el.addEventListener("input", () => calcTotal("expense"));
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

// ── Pull SP data into form ──
async function pullIntoForm() {
  const sel = $("spItemSelect");
  const status = $("spStatus");
  if (!sel.value) { status.innerHTML = ''; return; }

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
    status.innerHTML = `<div class="toast toast-success">✓ Loaded ${filled} fields. Totals recalculated.</div>`;
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

// ── Clear form ──
function clearForm() {
  document.querySelectorAll("[data-field]").forEach((el) => { el.value = ""; });
  $("pdfStatus").innerHTML = "";
}
