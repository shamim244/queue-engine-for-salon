module.exports = {
  apps: [
    {
      name: "salon-frontend",
      script: "bun",
      args: "run start",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
      restart_delay: 2000,
    },
  ],
};
