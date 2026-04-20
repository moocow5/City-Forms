require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const https = require("https");

const authRoutes = require("./routes/auth");
const formRoutes = require("./routes/forms");
const apiRoutes = require("./routes/api");

const app = express();
const PORT = process.env.PORT || 3000;
const SP_ORIGIN = process.env.SP_ORIGIN || "https://cityofnorthplattene.sharepoint.com";

// ── View engine ──
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 60 * 60 * 1000,
    },
  })
);

// ── Allow SharePoint to iframe this app ──
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", `frame-ancestors 'self' ${SP_ORIGIN}`);
  res.removeHeader("X-Frame-Options");

  const origin = req.headers.origin;
  if (origin && (origin === SP_ORIGIN || origin.endsWith(".sharepoint.com"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── Make user info available to all views ──
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.embedded = req.query.embedded === "1" || req.session.embedded || false;
  if (req.query.embedded === "1") req.session.embedded = true;
  next();
});

// ── Routes ──
app.use("/auth", authRoutes);
app.use("/forms", formRoutes);
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.redirect("/forms/travel-expense");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const keyPath  = path.join(__dirname, "certs", "server.key");
const certPath = path.join(__dirname, "certs", "server.cert");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const sslOptions = {
    key:  fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`\n  City Forms running → https://localhost:${PORT}`);
    console.log(`  SharePoint embed URL → https://localhost:${PORT}/forms/travel-expense?embedded=1\n`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`\n  City Forms running (HTTP) → http://localhost:${PORT}`);
    console.log(`  Run 'node generate-cert.js' to enable HTTPS.\n`);
  });
}
