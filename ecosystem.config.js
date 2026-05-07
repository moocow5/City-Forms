module.exports = {
  apps: [
    {
      name: "city-forms",
      script: "server.js",
      cwd: "C:\\Scripts\\City Forms",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      max_restarts: 10,
      min_uptime: "5s",
      restart_delay: 2000,
      merge_logs: true,
      time: true,
      out_file: "C:\\Scripts\\City Forms\\logs\\out.log",
      error_file: "C:\\Scripts\\City Forms\\logs\\error.log",
    },
  ],
};
