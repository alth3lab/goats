module.exports = {
  apps: [
    {
      name: "next-app",
      script: "node",
      args: ".next/standalone/server.js",
      autorestart: true,
      max_restarts: 5,
      restart_delay: 2000,

      env: { NODE_ENV: "production" },
    },
    {
      name: "feeds-cron",
      script: "npm",
      args: "run feeds:cron",
      max_restarts: 5,
      restart_delay: 2000,

      autorestart: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
