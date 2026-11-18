module.exports = {
  apps: [
    {
      name: "salon-api-1",
      script: "bun",
      args: "index.ts",
      env: {
        PORT: 3001,
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
      restart_delay: 2000,
    },
    {
      name: "salon-api-2",
      script: "bun",
      args: "index.ts",
      env: {
        PORT: 3002,
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
      restart_delay: 2000,
    },
  ],
};
