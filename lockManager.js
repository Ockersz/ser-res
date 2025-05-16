const fs = require("fs");
const path = require("path");

const LOCK_DIR = path.resolve(__dirname, "./locks");

if (!fs.existsSync(LOCK_DIR)) {
  fs.mkdirSync(LOCK_DIR);
}

const getLockPath = (name) => path.join(LOCK_DIR, `${name}.lock`);

function isLocked(name) {
  return fs.existsSync(getLockPath(name));
}

function createLock(name) {
  fs.writeFileSync(getLockPath(name), `${Date.now()}`);
}

function releaseLock(name) {
  const lockPath = getLockPath(name);
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
  }
}

module.exports = {
  isLocked,
  createLock,
  releaseLock,
};
