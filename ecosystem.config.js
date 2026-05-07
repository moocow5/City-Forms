const path = require("path");

module.exports = {
  apps: [
    {
      name: "city-forms",
      script: "server.js",
      cwd: __dirname,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      max_restarts: 10,
      min_uptime: "5s",
      restart_delay: 2000,
      merge_logs: true,
      time: true,
      out_file: path.join(__dirname, "logs", "out.log"),
      error_file: path.join(__dirname, "logs", "error.log"),
    },
  ],
};
