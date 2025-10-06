/** @type {import('lint-staged').Config} */
module.exports = {
  "*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}": [
    "eslint --fix",
    "prettier --config prettier.config.cjs --write",
  ],
  "*.{json,md,mdx,css,scss,html,yml,yaml}": ["prettier --config prettier.config.cjs --write"],
};
