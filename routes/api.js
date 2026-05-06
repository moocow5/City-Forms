const express = require("express");
const router = express.Router();
const sp = require("../services/sharepoint");
const { generatePDF, generateReconcilePDF } = require("../services/pdf");
const settings = require("../services/settings");
const fs = require("fs/promises");
const path = require("path");

// Middleware: require auth
function requireAuth(req, res, next) {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  next();
}

// Middleware: require admin (email must be in ADMIN_EMAILS env var)
function requireAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const userEmail = (req.session.user?.username || "").toLowerCase();
  if (!adminEmails.length || !adminEmails.includes(userEmail)) {
    return res.status(403).json({ error: "Forbidden" });
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
    console.error("Get items error:", err);
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
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
    console.error("Get item form-data error:", err);
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
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
    console.error("Create item error:", err);
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
});

// PATCH /api/items/:id/reconcile — save reconciliation actuals to an existing SP item
router.patch("/items/:id/reconcile", requireAuth, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId || (await sp.getSiteId(token));
    const listId = req.session.spListId || (await sp.getListId(token, siteId));
    await sp.saveReconciliation(token, siteId, listId, req.params.id, req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Save reconciliation error:", err);
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
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
    console.error("Update item error:", err);
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
});

// POST /api/generate-pdf — fill PDF template with form data, return PDF file
router.post("/generate-pdf", requireAuth, async (req, res) => {
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
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
});

// POST /api/generate-reconcile-pdf — fill page 2 of template with reconciliation data
router.post("/generate-reconcile-pdf", requireAuth, async (req, res) => {
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
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
});

// GET /api/settings — return current rate defaults (admin only)
router.get("/settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId;
    if (!siteId) return res.json({});
    const data = await settings.getSettings(token, siteId);
    res.json(data);
  } catch (e) {
    console.error("Get settings error:", e);
    res.json({});
  }
});

// POST /api/settings — save rate defaults (admin only)
router.post("/settings", requireAuth, requireAdmin, async (req, res) => {
  try {
    const token = req.session.accessToken;
    const siteId = req.session.spSiteId;
    if (!siteId) return res.status(400).json({ error: "No site connected" });
    await settings.saveSettings(token, siteId, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error("Save settings error:", e);
    res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
});

module.exports = router;
