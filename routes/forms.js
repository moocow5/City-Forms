const express = require("express");
const router = express.Router();
const sp = require("../services/sharepoint");

// GET /forms/reconcile — render the post-trip reconciliation page
router.get("/reconcile", async (req, res) => {
  let items = [];
  let spError = null;

  if (req.session.accessToken) {
    try {
      const token = req.session.accessToken;
      const siteId = await sp.getSiteId(token);
      const listId = await sp.getListId(token, siteId);
      items = await sp.getItems(token, siteId, listId);

      req.session.spSiteId = siteId;
      req.session.spListId = listId;
    } catch (err) {
      console.error("SP load error:", err.message);
      spError = err.message;
    }
  }

  res.render("reconcile", { items, spError });
});

// GET /forms/travel-expense — render the main form page
router.get("/travel-expense", async (req, res) => {
  let items = [];
  let spError = null;

  if (req.session.accessToken) {
    try {
      const token = req.session.accessToken;
      const siteId = await sp.getSiteId(token);
      const listId = await sp.getListId(token, siteId);
      items = await sp.getItems(token, siteId, listId);

      // Stash IDs in session for API calls
      req.session.spSiteId = siteId;
      req.session.spListId = listId;
    } catch (err) {
      console.error("SP load error:", err.message);
      spError = err.message;
    }
  }

  res.render("travel-expense", { items, spError });
});

module.exports = router;
