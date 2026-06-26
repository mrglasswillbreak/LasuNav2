import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", "out/**", "node_modules/**", "public/sw.js", "public/swe-worker-*.js"],
    rules: { "react-hooks/set-state-in-effect": "off" }
  }
];

export default config;
