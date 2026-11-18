module.exports = {
  apps: [
    {
      name: "salon-api-1",
      cwd: "./apps/api",
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
      cwd: "./apps/api",
      script: "bun",
      args: "index.ts",
      env: {
        PORT: 3002,
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
      restart_delay: 2000,
    },
    {
      name: "salon-frontend",
      cwd: "./apps/web",
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
