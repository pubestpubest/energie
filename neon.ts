import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: false,
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) return {};
    // New non-default branches: auto-expire
    if (!branch.exists) return { ttl: "7d" };
    return {};
  },
  preview: {
    functions: {
      api: { name: "api", source: "./hello.ts" },
    },
  },
});
