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

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generatePDF, FIELD_MAP };
