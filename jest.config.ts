import type { Config } from "jest";

const config: Config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",

  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
    "**/*.test.ts",
    "**/*.test.tsx",
  ],

  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/out/",
    "<rootDir>/build/",
  ],

  moduleNameMapper: {
    // lib/ directory lives at <rootDir>/lib (not src/lib), handle it first
    "^@/lib/supabase-server$": "<rootDir>/lib/supabase-server",
    "^@/(.*)$": "<rootDir>/src/$1",
    // Stub CSS/image imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/__tests__/__mocks__/fileMock.js",
  },

  collectCoverageFrom: [
    "src/lib/bookingFulfillment.ts",
    "src/lib/cronAuth.ts",
    "src/lib/analytics.ts",
    "src/app/api/stripe/webhook/route.ts",
    "src/app/api/cron/run-daily-marketing/route.ts",
    "src/app/api/trigger-n8n/route.ts",
    "src/app/api/gen-magic-content/route.ts",
    "src/app/api/book-flow/route.ts",
    "middleware.ts",
    "!**/*.d.ts",
  ],

  coverageThreshold: {
    global: {
      branches: 40,
      functions: 30,
      lines: 50,
      statements: 50,
    },
  },

  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          module: "commonjs",
          moduleResolution: "node",
        },
      },
    ],
  },

  transformIgnorePatterns: ["/node_modules/(?!(@supabase|next)/)"],

  testTimeout: 10000,
};

export default config;
