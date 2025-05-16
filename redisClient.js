const { createClient } = require("redis");

const client = createClient({
  url: "redis://default:b921ba3a569a40319fb585a5079b7785@fly-dawn-wave-6563.upstash.io:6379",
});

client.on("error", (err) => console.error("Redis Client Error", err));

client.connect();

module.exports = client;

// redis://default:b921ba3a569a40319fb585a5079b7785@fly-dawn-wave-6563.upstash.io:6379

// dawn-wave-6563
