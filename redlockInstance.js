const Redlock = require("redlock");
const redisClient = require("./redisClient");

const redlock = new Redlock([redisClient], {
  retryCount: 3,
  retryDelay: 200,
});

module.exports = redlock;
