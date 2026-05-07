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
  breakfast: "Breakfast",
  breakfastRate: "breakfastRate",
  breakfastTotal: "Breakfast total 1",
  lunch: "Lunch",
  lunchRate: "lunchRate",
  lunchTotal: "Lunchtotal1",
  supper: "Supper",
  supperRate: "supperRate",
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
  breakfast2: "Breakfast2",
  breakfastRate2: "breakfastRate2",
  breakfastTotal2: "Breakfast total2",
  lunch2: "Lunch2",
  lunchRate2: "lunchRate2",
  lunchTotal2: "Lunchtotal2",
  supper2: "Supper2",
  supperRate2: "supperRate2",
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

const CURRENCY_FIELDS = new Set([
  'regCheck','travelCheck','lodgingTotal','mileageTotal',
  'breakfastTotal','lunchTotal','supperTotal',
  'other1Total','other2Total','other3Total','other4Total','other5Total',
  'estimatedTotal','totalPrepaid','advanceMoney',
  'reg2','travel2','lodgingTotal2','mileageTotal2',
  'breakfastTotal2','lunchTotal2','supperTotal2',
  'other1Total2','other2Total2','other3Total2','other4Total2','other5Total2',
  'totalExpense','amountPaid','advanceMoney2','amountDue',
]);

function fmtPdfValue(key, value) {
  if (!value && value !== 0) return '';
  if (CURRENCY_FIELDS.has(key)) {
    const n = parseFloat(value);
    return isNaN(n) ? String(value) : `$${n.toFixed(2)}`;
  }
  return String(value);
}

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
        form.getTextField(pdfFieldName).setText(fmtPdfValue(formKey, value));
      } catch {
        // Field may not exist in this template version — skip
      }
    }
  }

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
  breakfast2:       "Breakfast2",
  breakfastRate2:   "breakfastRate2",
  breakfastTotal2:  "Breakfast total2",
  lunch2:           "Lunch2",
  lunchRate2:       "lunchRate2",
  lunchTotal2:      "Lunchtotal2",
  supper2:          "Supper2",
  supperRate2:      "supperRate2",
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
        form.getTextField(pdfFieldName).setText(fmtPdfValue(formKey, value));
      } catch {
        // Field not in this template version — skip
      }
    }
  }

  // Remove page 1 — reconciliation is page 2 only
  pdfDoc.removePage(0);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generatePDF, generateReconcilePDF, FIELD_MAP, RECONCILE_FIELD_MAP };
