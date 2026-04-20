const express = require("express");
const router = express.Router();
const sp = require("../services/sharepoint");
const { generatePDF, generateReconcilePDF } = require("../services/pdf");
const multer = require("multer") || null; // optional — for PDF template upload
const fs = require("fs/promises");
const path = require("path");

// Middleware: require auth
function requireAuth(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  next();
}

// GET /api/items — return all SP items as JSON
router.get("/items", requireAuth, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId || (await sp.getSiteId(token));
    const listId = req.session.spListId || (await sp.getListId(token, siteId));
    const items = await sp.getItems(token, siteId, listId);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/items/:id/form-data — return mapped form fields for a single item
router.get("/items/:id/form-data", requireAuth, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId || (await sp.getSiteId(token));
    const listId = req.session.spListId || (await sp.getListId(token, siteId));
    const item = await sp.getItem(token, siteId, listId, req.params.id);
    const formData = sp.mapItemToForm(item);
    res.json({ formData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/items/:id/debug — return raw SP fields for debugging
router.get("/items/:id/debug", requireAuth, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId || (await sp.getSiteId(token));
    const listId = req.session.spListId || (await sp.getListId(token, siteId));
    const item = await sp.getItem(token, siteId, listId, req.params.id);
    res.json({ id: item.id, requesterName: item.requesterName, fields: item.fields });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items — create a new SP list item from form data
router.post("/items", requireAuth, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId || (await sp.getSiteId(token));
    const listId = req.session.spListId || (await sp.getListId(token, siteId));
    const newId = await sp.createItem(token, siteId, listId, req.body);
    res.json({ id: newId });
  } catch (err) {
    console.error("Create item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/items/:id — update an existing SP list item from form data
router.patch("/items/:id", requireAuth, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId || (await sp.getSiteId(token));
    const listId = req.session.spListId || (await sp.getListId(token, siteId));
    await sp.updateItem(token, siteId, listId, req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Update item error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate-pdf — fill PDF template with form data, return PDF file
router.post("/generate-pdf", async (req, res) => {
  try {
    const formData = req.body;
    const templateName = "travel-expense-template.pdf";

    // Check template exists
    const templateDir = path.join(__dirname, "..", "public", "templates");
    const templatePath = path.join(templateDir, templateName);
    try {
      await fs.access(templatePath);
    } catch {
      return res.status(400).json({
        error: "PDF template not found. Upload your template to public/templates/travel-expense-template.pdf",
      });
    }

    const pdfBuffer = await generatePDF(templateName, formData);

    const empName = (formData.employeeName || "employee").replace(/\s+/g, "_");
    const dt = formData.fromDate || new Date().toISOString().slice(0, 10);
    const filename = `Travel_Expense_${empName}_${dt}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate-reconcile-pdf — fill page 2 of template with reconciliation data
router.post("/generate-reconcile-pdf", async (req, res) => {
  try {
    const templatePath = path.join(__dirname, "..", "public", "templates", "travel-expense-template.pdf");
    try { await fs.access(templatePath); } catch {
      return res.status(400).json({ error: "PDF template not found." });
    }

    const pdfBuffer = await generateReconcilePDF(req.body);
    const empName = (req.body.employeeName || "employee").replace(/\s+/g, "_");
    const dt = req.body.fromDate || new Date().toISOString().slice(0, 10);
    const filename = `Travel_Reconciliation_${empName}_${dt}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Reconcile PDF error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
