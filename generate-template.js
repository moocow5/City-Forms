/**
 * generate-template.js
 * 
 * Run once to create the fillable PDF template:
 *   node generate-template.js
 * 
 * Outputs: public/templates/travel-expense-template.pdf
 */

const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

// ── Colors ──
const BRAND      = rgb(0.059, 0.298, 0.506);   // #0f4c81
const BRAND_LT   = rgb(0.878, 0.922, 0.965);   // #e0ebf6
const DARK       = rgb(0.118, 0.161, 0.212);    // #1e293b
const GRAY       = rgb(0.392, 0.455, 0.529);    // #64748b
const GRAY_LT    = rgb(0.886, 0.910, 0.937);    // #e2e8f0
const LINE       = rgb(0.800, 0.830, 0.860);    // #ccd4db
const WHITE      = rgb(1, 1, 1);
const BLACK      = rgb(0, 0, 0);
const ACCENT_BG  = rgb(0.933, 0.945, 0.965);    // #eef1f6

async function build() {
  const doc = await PDFDocument.create();
  const helvetica     = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaObl  = await doc.embedFont(StandardFonts.HelveticaOblique);
  const form = doc.getForm();

  const W = 612, H = 792, M = 40, CW = W - 2 * M;

  // ── Load and embed city seal logo ──
  const logoPath = path.join(__dirname, "public", "images", "2022_CityLogo_WHITEFG.png");
  const logoBytes = fs.readFileSync(logoPath);
  const logoImage = await doc.embedPng(logoBytes);
  const logoDims = logoImage.scale(1);
  const logoAspect = logoDims.width / logoDims.height;

  const p1 = doc.addPage([W, H]);
  let y = H - M;

  function drawText(page, text, x, yy, { font = helvetica, size = 9, color = DARK } = {}) {
    page.drawText(text, { x, y: yy, size, font, color });
  }
  function drawLine(page, x1, yy, x2, { color: c = LINE, thickness = 0.5 } = {}) {
    page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness, color: c });
  }
  function drawRect(page, x, yy, w, h, { fill = WHITE, border = null, borderWidth = 0.5 } = {}) {
    page.drawRectangle({ x, y: yy, width: w, height: h, color: fill,
      borderColor: border || undefined, borderWidth: border ? borderWidth : 0 });
  }
  function addField(page, name, x, yy, w, h, { fontSize = 9 } = {}) {
    const tf = form.createTextField(name);
    tf.addToPage(page, { x, y: yy, width: w, height: h,
      borderWidth: 0.5, borderColor: LINE, backgroundColor: WHITE });
    tf.setFontSize(fontSize);
    return tf;
  }

  // ═══════════════════════════════════════
  // PAGE 1 HEADER — Professional with seal
  // ═══════════════════════════════════════
  const headerH = 80;
  drawRect(p1, 0, H - headerH, W, headerH, { fill: BRAND });
  // Thin accent line at bottom of header
  drawRect(p1, 0, H - headerH - 3, W, 3, { fill: rgb(0.04, 0.22, 0.4) });

  // Draw actual city seal logo in header (right side) — larger for clarity
  const logoH1 = 64;
  const logoW1 = logoH1 * logoAspect;
  p1.drawImage(logoImage, {
    x: W - M - logoW1,
    y: H - headerH / 2 - logoH1 / 2 - 2,
    width: logoW1,
    height: logoH1,
  });

  // Header text (left side)
  drawText(p1, "CITY OF NORTH PLATTE", M, H - 30, { font: helveticaBold, size: 20, color: WHITE });
  drawText(p1, "NEBRASKA", M, H - 44, { font: helvetica, size: 9, color: rgb(0.7, 0.82, 0.92) });
  drawText(p1, "Travel & Expense Request", M, H - 62, { font: helveticaObl, size: 11, color: rgb(0.8, 0.88, 0.95) });

  y = H - headerH - 16;

  // ── Compliance Statement (at top, before form fields) ──
  drawRect(p1, M, y - 26, CW, 30, { fill: ACCENT_BG, border: LINE, borderWidth: 0.5 });
  drawText(p1, "In compliance with the City of North Platte, NE, policy manual, I hereby request Educational, Training,", M + 10, y - 6, { size: 9, font: helveticaObl });
  drawText(p1, "or other City Business leave as requested below:", M + 10, y - 18, { size: 9, font: helveticaObl });
  y -= 40;

  // ── Form Fields ──
  drawText(p1, "DEPARTMENT", M, y, { font: helveticaBold, size: 8, color: GRAY });
  y -= 4; addField(p1, "DEPARTMENT", M, y - 16, CW, 18); y -= 28;

  drawText(p1, "EMPLOYEE NAME", M, y, { font: helveticaBold, size: 8, color: GRAY });
  y -= 4; addField(p1, "Name", M, y - 16, CW, 18); y -= 28;

  const colW4 = (CW - 24) / 4;
  drawText(p1, "FROM TIME", M, y, { font: helveticaBold, size: 8, color: GRAY });
  drawText(p1, "FROM DATE", M + colW4 + 8, y, { font: helveticaBold, size: 8, color: GRAY });
  drawText(p1, "TO TIME", M + (colW4 + 8) * 2, y, { font: helveticaBold, size: 8, color: GRAY });
  drawText(p1, "TO DATE", M + (colW4 + 8) * 3, y, { font: helveticaBold, size: 8, color: GRAY });
  y -= 4;
  addField(p1, "time", M, y - 16, colW4, 18);
  addField(p1, "date", M + colW4 + 8, y - 16, colW4, 18);
  addField(p1, "to time 1", M + (colW4 + 8) * 2, y - 16, colW4, 18);
  addField(p1, "date_2", M + (colW4 + 8) * 3, y - 16, colW4, 18);
  y -= 28;

  drawText(p1, "PURPOSE OF TRAVEL", M, y, { font: helveticaBold, size: 8, color: GRAY });
  y -= 4; addField(p1, "for the purpose of attending", M, y - 16, CW, 18); y -= 16;
  addField(p1, "Attending 2", M, y - 16, CW, 18); y -= 28;

  drawText(p1, "LOCATION", M, y, { font: helveticaBold, size: 8, color: GRAY });
  y -= 4; addField(p1, "location", M, y - 16, CW, 18); y -= 28;

  // ── Estimated Education/Training Expenses ──
  drawRect(p1, M, y - 2, CW, 20, { fill: BRAND_LT });
  drawText(p1, "ESTIMATED EDUCATION/TRAINING EXPENSES", M + 8, y + 3, { font: helveticaBold, size: 9, color: BRAND });
  drawText(p1, "Amount", M + CW - 68, y + 3, { font: helveticaBold, size: 8, color: GRAY });
  y -= 20;

  const LBL_X = M + 8, QTY_X = M + 160, RATE_X = M + 280;
  const TOT_X = M + CW - 115, TOT_W = 108, FLD_H = 16, ROW_H = 20;
  const IS_X = QTY_X, OS_X = QTY_X + 100;

  drawText(p1, "Registration", LBL_X, y + 3, { size: 9 }); drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Registration", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  drawText(p1, "Commercial Travel", LBL_X, y + 3, { size: 9 }); drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Travel total", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;

  drawText(p1, "Lodging", LBL_X, y + 3, { size: 9 });
  addField(p1, "Lodging", QTY_X, y, 55, FLD_H);
  drawText(p1, "nights @", QTY_X + 58, y + 3, { size: 8, color: GRAY });
  drawText(p1, "$", RATE_X - 6, y + 3, { size: 8, color: GRAY });
  addField(p1, "nights", RATE_X, y, 70, FLD_H);
  drawText(p1, "=", RATE_X + 74, y + 3, { size: 9, color: GRAY });
  drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Lodging total", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;

  drawText(p1, "Mileage", LBL_X, y + 3, { size: 9 });
  addField(p1, "Mileage", QTY_X, y, 55, FLD_H);
  drawText(p1, "miles @", QTY_X + 58, y + 3, { size: 8, color: GRAY });
  drawText(p1, "$", RATE_X - 6, y + 3, { size: 8, color: GRAY });
  addField(p1, "miles", RATE_X, y, 50, FLD_H);
  drawText(p1, "=", RATE_X + 54, y + 3, { size: 9, color: GRAY });
  drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Mileage total", TOT_X, y, TOT_W, FLD_H); y -= ROW_H + 2;

  // Meals
  drawRect(p1, M, y - 2, CW, 16, { fill: ACCENT_BG });
  drawText(p1, "MEALS", LBL_X, y + 1, { font: helveticaBold, size: 8, color: BRAND });
  drawText(p1, "# In State", IS_X, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p1, "$ Rate", IS_X + 45, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p1, "# Out State", OS_X, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p1, "$ Rate", OS_X + 50, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p1, "Total", TOT_X + 35, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  y -= 18;

  function mealRow(page, yy, label, names) {
    drawText(page, label, LBL_X, yy + 3, { size: 9 });
    addField(page, names[0], IS_X, yy, 38, FLD_H);
    drawText(page, "$", IS_X + 39, yy + 3, { size: 7, color: GRAY });
    addField(page, names[1], IS_X + 46, yy, 46, FLD_H);
    addField(page, names[2], OS_X, yy, 38, FLD_H);
    drawText(page, "$", OS_X + 39, yy + 3, { size: 7, color: GRAY });
    addField(page, names[3], OS_X + 46, yy, 46, FLD_H);
    drawText(page, "$", TOT_X - 8, yy + 3, { size: 8, color: GRAY });
    addField(page, names[4], TOT_X, yy, TOT_W, FLD_H);
  }

  mealRow(p1, y, "Breakfast", ["Breakfast","ISBreak1","OutState1","OSBreak1","Breakfast total 1"]); y -= ROW_H;
  mealRow(p1, y, "Lunch", ["Lunch","ISLunch1","OStatelunch1","OSLunch1","Lunchtotal1"]); y -= ROW_H;
  mealRow(p1, y, "Supper", ["Supper","ISSupper1","OutState3","OSSupper1","Suppertotal1"]); y -= ROW_H;

  drawText(p1, "Other", LBL_X, y + 3, { size: 9 }); addField(p1, "Other", QTY_X - 30, y, 200, FLD_H); drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Other total", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p1, "Other 2", QTY_X - 30, y, 200, FLD_H); drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Other total 2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p1, "Other 3", QTY_X - 30, y, 200, FLD_H); drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Other total 3", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p1, "Other 4", QTY_X - 30, y, 200, FLD_H); drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Other total 4", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p1, "Other 5", QTY_X - 30, y, 200, FLD_H); drawText(p1, "$", TOT_X - 8, y + 3, { size: 8, color: GRAY }); addField(p1, "Other total 5", TOT_X, y, TOT_W, FLD_H); y -= ROW_H + 4;

  // ── Estimated Trip Total (centered in gap between blue line and advance box) ──
  const dividerY = y + 14;
  drawLine(p1, M, dividerY, M + CW, { color: BRAND, thickness: 1.5 });
  const ettTextY = dividerY - 20;
  const ettBoxY = ettTextY - 6;
  drawText(p1, "ESTIMATED TRIP TOTAL", TOT_X - 148, ettTextY, { font: helveticaBold, size: 10, color: BRAND });
  drawText(p1, "$", TOT_X - 10, ettTextY, { font: helveticaBold, size: 11, color: BRAND });
  addField(p1, "Estimated total", TOT_X, ettBoxY, TOT_W, 20, { fontSize: 11 });
  y = ettBoxY - 34;

  // ── Advance Statement ──
  drawRect(p1, M, y - 18, CW, 48, { fill: BRAND_LT, border: BRAND, borderWidth: 1 });
  drawText(p1, "I further request advance travel expense money of", LBL_X, y + 8, { size: 9 });
  drawText(p1, "$", LBL_X + 224, y + 8, { font: helveticaBold, size: 10, color: BRAND });
  addField(p1, "advance_money", LBL_X + 232, y + 2, 80, 18, { fontSize: 9 });
  drawText(p1, "and will upon my return,", LBL_X + 318, y + 8, { size: 9 });
  drawText(p1, "submit an itemized statement of actual expenses incurred in the space below.", LBL_X, y - 10, { size: 9 });
  y -= 56;

  // ── Signatures ──
  drawLine(p1, M, y + 6, M + CW, { color: GRAY_LT, thickness: 0.5 });
  y -= 6;
  const sigW = (CW - 20) / 2;

  drawText(p1, "EMPLOYEE SIGNATURE", M, y, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p1, "DEPARTMENT HEAD", M + sigW + 20, y, { font: helveticaBold, size: 7, color: GRAY });
  y -= 24;
  drawLine(p1, M, y, M + sigW, { color: DARK, thickness: 0.75 });
  drawLine(p1, M + sigW + 20, y, M + CW, { color: DARK, thickness: 0.75 });
  y -= 16;

  drawText(p1, "CITY ADMINISTRATOR", M, y, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p1, "DATE", M + sigW + 20, y, { font: helveticaBold, size: 7, color: GRAY });
  y -= 24;
  drawLine(p1, M, y, M + sigW, { color: DARK, thickness: 0.75 });
  drawLine(p1, M + sigW + 20, y, M + CW, { color: DARK, thickness: 0.75 });

  // ═══════════════════════════════════════
  // PAGE 2 — EXPENSE REPORT
  // ═══════════════════════════════════════
  const p2 = doc.addPage([W, H]);
  y = H - M;

  // P2 Header
  drawRect(p2, 0, H - headerH, W, headerH, { fill: BRAND });
  drawRect(p2, 0, H - headerH - 3, W, 3, { fill: rgb(0.04, 0.22, 0.4) });

  // Draw actual city seal logo on P2
  p2.drawImage(logoImage, {
    x: W - M - logoW1,
    y: H - headerH / 2 - logoH1 / 2 - 2,
    width: logoW1,
    height: logoH1,
  });

  drawText(p2, "CITY OF NORTH PLATTE", M, H - 30, { font: helveticaBold, size: 20, color: WHITE });
  drawText(p2, "NEBRASKA", M, H - 44, { font: helvetica, size: 9, color: rgb(0.7, 0.82, 0.92) });
  drawText(p2, "Expense Report — Actual Costs", M, H - 62, { font: helveticaObl, size: 11, color: rgb(0.8, 0.88, 0.95) });
  drawText(p2, "Distribution / Account Number", M + CW - 160, H - 62, { font: helvetica, size: 8, color: rgb(0.65, 0.78, 0.9) });
  y = H - headerH - 14;

  drawRect(p2, M, y - 2, CW, 20, { fill: BRAND_LT });
  drawText(p2, "ACTUAL EXPENSES", M + 8, y + 3, { font: helveticaBold, size: 9, color: BRAND });
  y -= 24;

  drawText(p2, "Registration", LBL_X, y + 3, { size: 9 }); addField(p2, "Registration2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  drawText(p2, "Commercial Travel", LBL_X, y + 3, { size: 9 }); addField(p2, "ComTravel2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;

  drawText(p2, "Lodging", LBL_X, y + 3, { size: 9 });
  addField(p2, "Lodging_2", QTY_X, y, 55, FLD_H);
  drawText(p2, "nights @", QTY_X + 58, y + 3, { size: 8, color: GRAY });
  addField(p2, "nights_2", RATE_X, y, 70, FLD_H);
  drawText(p2, "=", RATE_X + 74, y + 3, { size: 9, color: GRAY });
  addField(p2, "Loding total2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;

  drawText(p2, "Mileage", LBL_X, y + 3, { size: 9 });
  addField(p2, "Mileage_2", QTY_X, y, 55, FLD_H);
  drawText(p2, "miles @", QTY_X + 58, y + 3, { size: 8, color: GRAY });
  addField(p2, "miles_2", RATE_X, y, 50, FLD_H);
  drawText(p2, "=", RATE_X + 54, y + 3, { size: 9, color: GRAY });
  addField(p2, "Mile total 2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H + 2;

  drawRect(p2, M, y - 2, CW, 16, { fill: ACCENT_BG });
  drawText(p2, "MEALS", LBL_X, y + 1, { font: helveticaBold, size: 8, color: BRAND });
  drawText(p2, "# In State", IS_X, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p2, "Rate", IS_X + 45, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p2, "# Out State", OS_X, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p2, "Rate", OS_X + 50, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p2, "Total", TOT_X + 35, y + 1, { font: helveticaBold, size: 7, color: GRAY });
  y -= 20;

  mealRow(p2, y, "Breakfast", ["Breakfast2","ISBreak2","OSBreak2","OSBreak3","Breakfast total2"]); y -= ROW_H;
  mealRow(p2, y, "Lunch", ["Lunch2","ISLunch2","OSLunch2","OSLunch3","Lunchtotal2"]); y -= ROW_H;
  mealRow(p2, y, "Supper", ["Supper2","ISSupper2","OSSupper2","OSSupper3","Suppertotal2"]); y -= ROW_H + 2;

  drawText(p2, "Other", LBL_X, y + 3, { size: 9 }); addField(p2, "Other_2", QTY_X - 30, y, 200, FLD_H); addField(p2, "Other total2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p2, "Total", QTY_X - 30, y, 200, FLD_H); addField(p2, "Total3", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p2, "Other_3", QTY_X - 30, y, 200, FLD_H); addField(p2, "Other total3 2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p2, "Other_4", QTY_X - 30, y, 200, FLD_H); addField(p2, "Other total4 2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H;
  addField(p2, "Other_5", QTY_X - 30, y, 200, FLD_H); addField(p2, "Other total5 2", TOT_X, y, TOT_W, FLD_H); y -= ROW_H + 4;

  drawLine(p2, M, y + 14, M + CW, { color: BRAND, thickness: 1.5 });
  drawText(p2, "TOTAL EXPENSES", LBL_X, y, { font: helveticaBold, size: 10, color: BRAND });
  drawText(p2, "$", TOT_X - 14, y, { font: helveticaBold, size: 11, color: BRAND });
  addField(p2, "Total expense2", TOT_X, y - 4, TOT_W, 20, { fontSize: 11 }); y -= 36;

  drawRect(p2, M, y - 6, CW, 56, { fill: ACCENT_BG, border: LINE });
  drawText(p2, "Less: Amounts paid direct", LBL_X + 20, y + 24, { size: 9 });
  drawText(p2, "($", TOT_X - 16, y + 24, { size: 9 });
  addField(p2, "Amount pd", TOT_X, y + 20, TOT_W - 10, FLD_H);
  drawText(p2, ")", TOT_X + TOT_W - 6, y + 24, { size: 9 });
  drawText(p2, "Less: Advance money", LBL_X + 20, y + 4, { size: 9 });
  drawText(p2, "($", TOT_X - 16, y + 4, { size: 9 });
  addField(p2, "Advance money", TOT_X, y, TOT_W - 10, FLD_H);
  drawText(p2, ")", TOT_X + TOT_W - 6, y + 4, { size: 9 });
  y -= 32;

  drawRect(p2, M, y - 10, CW, 30, { fill: BRAND_LT, border: BRAND, borderWidth: 1.5 });
  drawText(p2, "AMOUNT DUE EMPLOYEE OR (REFUND)", LBL_X, y, { font: helveticaBold, size: 10, color: BRAND });
  drawText(p2, "$", TOT_X - 14, y, { font: helveticaBold, size: 11, color: BRAND });
  addField(p2, "Amount due", TOT_X, y - 5, TOT_W, 20, { fontSize: 11 }); y -= 50;

  drawLine(p2, M, y + 8, M + CW, { color: GRAY_LT, thickness: 0.5 }); y -= 8;
  drawText(p2, "EMPLOYEE SIGNATURE", M, y, { font: helveticaBold, size: 7, color: GRAY });
  drawText(p2, "DEPARTMENT HEAD", M + sigW + 20, y, { font: helveticaBold, size: 7, color: GRAY });
  y -= 4;
  drawLine(p2, M, y - 14, M + sigW, { color: DARK, thickness: 0.75 });
  addField(p2, "Department Head_2", M + sigW + 20, y - 16, sigW, FLD_H); y -= 32;
  drawText(p2, "for expense report", M + 60, y + 16, { size: 7, color: GRAY });
  drawText(p2, "for expense report", M + sigW + 20 + 60, y + 16, { size: 7, color: GRAY });
  drawText(p2, "revised 7-1-2022", M + CW - 80, M - 10, { size: 7, color: GRAY });

  const pdfBytes = await doc.save();
  const outDir = path.join(__dirname, "public", "templates");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "travel-expense-template.pdf");
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`\n  ✓ Template saved → ${outPath}`);
  console.log(`    ${pdfBytes.length} bytes, 2 pages, fillable form fields\n`);
}

build().catch((err) => { console.error("Error:", err); process.exit(1); });
