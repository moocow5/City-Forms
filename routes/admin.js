const express = require("express");
const router = express.Router();
const sp = require("../services/sharepoint");
const settings = require("../services/settings");

function requireAuth(req, res, next) {
  if (!req.session || !req.session.accessToken) {
    return res.redirect("/auth/signin");
  }
  next();
}

function requireAdmin(req, res, next) {
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const userEmail = (req.session.user?.username || "").toLowerCase();
  if (!adminEmails.length || !adminEmails.includes(userEmail)) {
    return res.status(403).send("Forbidden: admin access required.");
  }
  next();
}

router.get("/settings", requireAuth, requireAdmin, async (req, res) => {
  const token = req.session.accessToken;
  const siteId = req.session.spSiteId;
  let currentSettings = {};
  let error = null;
  try {
    if (siteId) {
      currentSettings = await settings.getSettings(token, siteId);
    }
  } catch (e) {
    console.error("Admin get settings error:", e);
    error = "Failed to load settings.";
  }
  res.render("admin-settings", {
    user: req.session.account || null,
    settings: currentSettings,
    error,
    embedded: req.query.embedded === "1",
  });
});

module.exports = router;
