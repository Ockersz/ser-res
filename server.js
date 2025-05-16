const express = require("express");
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");
const redlock = require("./redlockInstance");

const app = express();
const PORT = process.env.PORT || 3001;

// Lock TTL (time to live) in ms
// const LOCK_TTL = 30 * 1000; // 30 seconds
const RESTART_TTL = 45000;
const REPORT_TTL = 30000;

app.get("/restart", async (req, res) => {
  let lock;
  try {
    lock = await redlock.acquire(["locks:restart"], RESTART_TTL);
  } catch (err) {
    return res
      .status(400)
      .send("Restart is already in progress. Try again later.");
  }

  const conn = new Client();

  try {
    conn
      .on("ready", () => {
        console.log("SSH Client :: Ready");
        conn.exec(
          "sudo /etc/init.d/mysql restart && cd api && sudo yarn run build:prod",
          (err, stream) => {
            if (err) {
              res.status(500).send("Service restart failed.");
              lock
                .release()
                .catch((err) => console.error("Failed to release lock:", err));
              return conn.end();
            }

            stream
              .on("close", (code, signal) => {
                console.log(
                  `Stream :: Close :: Code: ${code}, Signal: ${signal}`
                );
                conn.end();
                lock
                  .release()
                  .catch((err) =>
                    console.error("Failed to release lock:", err)
                  );
                res.status(200).send("Service restarted successfully.");
              })
              .on("data", (data) => console.log(`STDOUT: ${data}`))
              .stderr.on("data", (data) => console.error(`STDERR: ${data}`));
          }
        );
      })
      .connect({
        host: "ec2-44-199-44-200.compute-1.amazonaws.com",
        port: 22,
        username: "ubuntu",
        privateKey: fs.readFileSync(path.resolve(__dirname, "./ubuntu.pem")),
      });
  } catch (error) {
    console.error(error);
    if (lock)
      await lock
        .release()
        .catch((err) => console.error("Failed to release lock:", err));
    res.status(500).send("Service restart failed.");
  }
});

app.get("/res-report", async (req, res) => {
  let lock;
  try {
    lock = await redlock.acquire(["locks:res-report"], REPORT_TTL);
  } catch (err) {
    return res
      .status(400)
      .send("Report service restart already in progress. Try again later.");
  }

  const conn = new Client();

  try {
    conn
      .on("ready", () => {
        console.log("SSH Client :: Ready");
        conn.exec(
          "> nohup.out && sudo kill -9 $(sudo lsof -t -i:8080) && nohup java $JAVA_OPTS -jar report-service-0.0.1-SNAPSHOT.jar &",
          (err, stream) => {
            if (err) {
              res.status(500).send("Report restart failed.");
              lock
                .release()
                .catch((err) => console.error("Failed to release lock:", err));
              return conn.end();
            }

            stream
              .on("close", (code, signal) => {
                console.log(
                  `Stream :: Close :: Code: ${code}, Signal: ${signal}`
                );
                conn.end();
                lock
                  .release()
                  .catch((err) =>
                    console.error("Failed to release lock:", err)
                  );
                res.status(200).send("Report service restarted successfully.");
              })
              .on("data", (data) => console.log(`STDOUT: ${data}`))
              .stderr.on("data", (data) => console.error(`STDERR: ${data}`));
          }
        );
      })
      .connect({
        host: "ec2-34-199-244-68.compute-1.amazonaws.com",
        port: 22,
        username: "ubuntu",
        privateKey: fs.readFileSync(path.resolve(__dirname, "./ubuntu.pem")),
      });
  } catch (error) {
    console.error(error);
    if (lock)
      await lock
        .release()
        .catch((err) => console.error("Failed to release lock:", err));
    res.status(500).send("Report restart failed.");
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Restart and Report API!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
