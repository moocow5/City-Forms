const { PDFDocument } = require("pdf-lib");
const fs = require("fs/promises");
const path = require("path");

// Same field map as the original form — maps our form field keys → PDF field names
const FIELD_MAP = {
  department: "DEPARTMENT",
  employeeName: "Name",
  fromTime: "time",
  fromDate: "date",
  toTime: "to time 1",
  toDate: "date_2",
  purpose: "for the purpose of attending",
  purpose2: "Attending 2",
  location: "location",
  regCheck: "Registration",
  travelCheck: "Travel total",
  lodgingNights: "Lodging",
  lodgingRate: "nights",
  lodgingTotal: "Lodging total",
  mileageMiles: "Mileage",
  mileageRate: "miles",
  mileageTotal: "Mileage total",
  breakfastIS: "Breakfast",
  breakfastISRate: "ISBreak1",
  breakfastOS: "OutState1",
  breakfastOSRate: "OSBreak1",
  breakfastTotal: "Breakfast total 1",
  lunchIS: "Lunch",
  lunchISRate: "ISLunch1",
  lunchOS: "OStatelunch1",
  lunchOSRate: "OSLunch1",
  lunchTotal: "Lunchtotal1",
  supperIS: "Supper",
  supperISRate: "ISSupper1",
  supperOS: "OutState3",
  supperOSRate: "OSSupper1",
  supperTotal: "Suppertotal1",
  other1Desc: "Other",
  other1Total: "Other total",
  other2Desc: "Other 2",
  other2Total: "Other total 2",
  other3Desc: "Other 3",
  other3Total: "Other total 3",
  other4Desc: "Other 4",
  other4Total: "Other total 4",
  other5Desc: "Other 5",
  other5Total: "Other total 5",
  estimatedTotal: "Estimated total",
  totalPrepaid: "Total request",
  advanceMoney: "advance_money",
  deptHead: "Department Head",
  cityAdmin: "City Administrator",
  approvalDate: "dATE",
  reg2: "Registration2",
  travel2: "ComTravel2",
  lodgingNights2: "Lodging_2",
  lodgingRate2: "nights_2",
  lodgingTotal2: "Loding total2",
  mileageMiles2: "Mileage_2",
  mileageRate2: "miles_2",
  mileageTotal2: "Mile total 2",
  breakfastIS2: "Breakfast2",
  breakfastISRate2: "ISBreak2",
  breakfastOS2: "OSBreak2",
  breakfastOSRate2: "OSBreak3",
  breakfastTotal2: "Breakfast total2",
  lunchIS2: "Lunch2",
  lunchISRate2: "ISLunch2",
  lunchOS2: "OSLunch2",
  lunchOSRate2: "OSLunch3",
  lunchTotal2: "Lunchtotal2",
  supperIS2: "Supper2",
  supperISRate2: "ISSupper2",
  supperOS2: "OSSupper2",
  supperOSRate2: "OSSupper3",
  supperTotal2: "Suppertotal2",
  other1Desc2: "Other_2",
  other1Total2: "Other total2",
  other2Desc2: "Total",
  other2Total2: "Total3",
  totalExpense: "Total expense2",
  amountPaid: "Amount pd",
  advanceMoney2: "Advance money",
  amountDue: "Amount due",
  deptHead2: "Department Head_2",
};

// Path to the blank PDF template (user uploads once, stored in /public/templates/)
const TEMPLATE_DIR = path.join(__dirname, "..", "public", "templates");

/**
 * Add Other rows 3–5 to a PDF page by deriving positions from the existing
 * "Other total" (row 1) and "Other total 2" (row 2) widgets, then spacing 3
 * more rows below at the same interval.
 *
 * @param {import('pdf-lib').PDFDocument} pdfDoc
 * @param {import('pdf-lib').PDFForm} form
 * @param {number} pageIndex - 0 for page 1, 1 for page 2
 * @param {string} totalField1 - name of the existing Other-1 total field
 * @param {string} totalField2 - name of the existing Other-2 total field
 * @param {string} descField2  - name of the existing Other-2 desc field
 * @param {string[]} newDescNames  - 3 new desc field names (rows 3-5)
 * @param {string[]} newTotalNames - 3 new total field names (rows 3-5)
 * @param {object} formData
 */
/**
 * @param {string[]} descKeys  - formData keys for descriptions (e.g. ["other3Desc","other4Desc","other5Desc"])
 * @param {string[]} totalKeys - formData keys for totals
 */
function addExtraOtherFields(
  pdfDoc, form, pageIndex,
  totalField1, totalField2, descField2,
  newDescNames, newTotalNames,
  descKeys, totalKeys,
  formData
) {
  try {
    const page = pdfDoc.getPage(pageIndex);

    // Derive row spacing from the two existing total field widget positions
    const wgt1 = form.getTextField(totalField1).acroField.getWidgets()[0];
    const wgt2 = form.getTextField(totalField2).acroField.getWidgets()[0];
    const wgtDesc2 = form.getTextField(descField2).acroField.getWidgets()[0];

    if (!wgt1 || !wgt2 || !wgtDesc2) return;

    const r1 = wgt1.getRectangle();
    const r2 = wgt2.getRectangle();
    const rd2 = wgtDesc2.getRectangle();

    // rowH is positive: row 1 is higher on the page (larger y) than row 2
    const rowH = r1.y - r2.y;

    for (let i = 0; i < 3; i++) {
      // Each new row sits one more step BELOW row 2 (decreasing y in PDF coords)
      const newY = r2.y - rowH * (i + 1);

      const descField = form.createTextField(newDescNames[i]);
      descField.addToPage(page, { x: rd2.x, y: newY, width: rd2.width, height: rd2.height, borderWidth: 0.5 });
      const descVal = formData[descKeys[i]];
      if (descVal) descField.setText(String(descVal));

      const totalField = form.createTextField(newTotalNames[i]);
      totalField.addToPage(page, { x: r2.x, y: newY, width: r2.width, height: r2.height, borderWidth: 0.5 });
      const totalVal = formData[totalKeys[i]];
      if (totalVal) totalField.setText(String(totalVal));
    }
  } catch {
    // If template fields are missing or layout differs, skip gracefully
  }
}

/**
 * Generate a filled PDF from form data.
 * @param {string} templateName - filename of the PDF template
 * @param {object} formData - key/value pairs matching our field keys
 * @returns {Buffer} - the filled PDF bytes
 */
async function generatePDF(templateName, formData) {
  const templatePath = path.join(TEMPLATE_DIR, templateName);
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  for (const [formKey, pdfFieldName] of Object.entries(FIELD_MAP)) {
    const value = formData[formKey];
    if (value) {
      try {
        form.getTextField(pdfFieldName).setText(String(value));
      } catch {
        // Field may not exist in this template version — skip
      }
    }
  }

  // Add Other rows 3–5 dynamically (template only has 2)
  addExtraOtherFields(
    pdfDoc, form, 0,
    "Other total", "Other total 2", "Other 2",
    ["Other 3", "Other 4", "Other 5"],
    ["Other total 3", "Other total 4", "Other total 5"],
    ["other3Desc", "other4Desc", "other5Desc"],
    ["other3Total", "other4Total", "other5Total"],
    formData
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Fields that belong to the reconciliation (page 2) section only
const RECONCILE_FIELD_MAP = {
  reg2:             "Registration2",
  travel2:          "ComTravel2",
  lodgingNights2:   "Lodging_2",
  lodgingRate2:     "nights_2",
  lodgingTotal2:    "Loding total2",
  mileageMiles2:    "Mileage_2",
  mileageRate2:     "miles_2",
  mileageTotal2:    "Mile total 2",
  breakfastIS2:     "Breakfast2",
  breakfastISRate2: "ISBreak2",
  breakfastOS2:     "OSBreak2",
  breakfastOSRate2: "OSBreak3",
  breakfastTotal2:  "Breakfast total2",
  lunchIS2:         "Lunch2",
  lunchISRate2:     "ISLunch2",
  lunchOS2:         "OSLunch2",
  lunchOSRate2:     "OSLunch3",
  lunchTotal2:      "Lunchtotal2",
  supperIS2:        "Supper2",
  supperISRate2:    "ISSupper2",
  supperOS2:        "OSSupper2",
  supperOSRate2:    "OSSupper3",
  supperTotal2:     "Suppertotal2",
  other1Desc2:      "Other_2",
  other1Total2:     "Other total2",
  other2Desc2:      "Total",
  other2Total2:     "Total3",
  other3Desc2:      "Other_3",
  other3Total2:     "Other total3 2",
  other4Desc2:      "Other_4",
  other4Total2:     "Other total4 2",
  other5Desc2:      "Other_5",
  other5Total2:     "Other total5 2",
  totalExpense:     "Total expense2",
  amountPaid:       "Amount pd",
  advanceMoney2:    "Advance money",
  amountDue:        "Amount due",
  deptHead2:        "Department Head_2",
};

/**
 * Generate a filled reconciliation PDF using page 2 of the travel expense template.
 * Fills section-2 fields, then removes page 1 from the output.
 */
async function generateReconcilePDF(formData) {
  const templatePath = path.join(TEMPLATE_DIR, "travel-expense-template.pdf");
  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  for (const [formKey, pdfFieldName] of Object.entries(RECONCILE_FIELD_MAP)) {
    const value = formData[formKey];
    if (value) {
      try {
        form.getTextField(pdfFieldName).setText(String(value));
      } catch {
        // Field not in this template version — skip
      }
    }
  }

  // Add Other rows 3–5 dynamically on page 2 (template only has 2)
  addExtraOtherFields(
    pdfDoc, form, 1,
    "Other total2", "Total3", "Total",
    ["Other_3", "Other_4", "Other_5"],
    ["Other total3 2", "Other total4 2", "Other total5 2"],
    ["other3Desc2", "other4Desc2", "other5Desc2"],
    ["other3Total2", "other4Total2", "other5Total2"],
    formData
  );

  // Remove page 1 — reconciliation is page 2 only
  pdfDoc.removePage(0);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generatePDF, generateReconcilePDF, FIELD_MAP, RECONCILE_FIELD_MAP };
