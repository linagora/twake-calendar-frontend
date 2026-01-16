import type { Config } from "jest";

// Set timezone to UTC for consistent test results across all environments
process.env.TZ = "UTC";

const config: Config = {
  collectCoverage: true,
  coverageDirectory: "coverage",

  projects: [
    {
      displayName: "dom",
      clearMocks: true,
      moduleFileExtensions: [
        "js",
        "mjs",
        "cjs",
        "jsx",
        "ts",
        "tsx",
        "json",
        "node",
      ],
      testEnvironment: "jsdom",
      testMatch: ["**/*.test.tsx"],
      testTimeout: 15000,
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
        "^.+\\.(js|jsx|mjs)$": "babel-jest",
        "^.+\\.(css|scss|sass|less|styl|stylus)$":
          "jest-preview/transforms/css",
        "^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)":
          "jest-preview/transforms/file",
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
          "<rootDir>/fileTransformer.ts",
      },
      transformIgnorePatterns: [
        "/node_modules/(?!(preact|@fullcalendar|react-calendar|get-user-locale|memoize|mimic-function|@wojtekmaj|ky|cozy-ui|p-map|@linagora/twake-mui)/)",
      ],

      moduleNameMapper: {
        "^preact(/(.*)|$)": "preact$1",
        "^react$": "<rootDir>/node_modules/react",
        "^react-dom$": "<rootDir>/node_modules/react-dom",
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
    },
    {
      displayName: "node",
      clearMocks: true,
      moduleFileExtensions: [
        "js",
        "mjs",
        "cjs",
        "jsx",
        "ts",
        "tsx",
        "json",
        "node",
      ],
      testEnvironment: "node",
      testMatch: ["**/*.test.ts"],
      testTimeout: 15000,
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
        "^.+\\.(js|jsx|mjs)$": "babel-jest",
      },
      transformIgnorePatterns: ["/node_modules/(?!(ky|@linagora/twake-mui)/)"],
      setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
  ],
};

export default config;
