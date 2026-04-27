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

router.get("/settings", requireAuth, async (req, res) => {
  const token = req.session.accessToken;
  const siteId = req.session.spSiteId;
  let currentSettings = {};
  let error = null;
  try {
    if (siteId) {
      currentSettings = await settings.getSettings(token, siteId);
    }
  } catch (e) {
    error = e.message;
  }
  res.render("admin-settings", {
    user: req.session.account || null,
    settings: currentSettings,
    error,
    embedded: req.query.embedded === "1",
  });
});

module.exports = router;
