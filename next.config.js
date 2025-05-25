// next.config.js
const fs   = require("fs");
const yaml = require("js-yaml");

const raw = fs.readFileSync("./config.yaml", "utf8");
const cfg = yaml.load(raw);

module.exports = {
  publicRuntimeConfig: {
    agentEndpoints: cfg.agent_endpoints,
    fileEndpoints:  cfg.file_endpoints,
  },
};
