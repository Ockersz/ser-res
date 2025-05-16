const express = require("express");
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory flags to prevent concurrent operations
let called = false;
let res_report = false;

app.get("/restart", (req, res) => {
  if (called) {
    return res
      .status(400)
      .send("Restart is already in progress. Try again later.");
  }

  called = true;
  const conn = new Client();

  try {
    conn
      .on("ready", () => {
        console.log("SSH Client :: Ready");
        conn.exec(
          "sudo /etc/init.d/mysql restart && cd api && sudo yarn run build:prod",
          (err, stream) => {
            if (err) {
              called = false;
              res.status(500).send("Service restart failed.");
              return conn.end();
            }

            stream
              .on("close", (code, signal) => {
                console.log(`Stream :: Close :: Code: ${code}, Signal: ${signal}`);
                conn.end();
                called = false;
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
    called = false;
    res.status(500).send("Service restart failed.");
  }
});

app.get("/res-report", (req, res) => {
  if (res_report) {
    return res
      .status(400)
      .send("Report service restart already in progress. Try again later.");
  }

  res_report = true;
  const conn = new Client();

  try {
    conn
      .on("ready", () => {
        console.log("SSH Client :: Ready");
        conn.exec(
          "> nohup.out && sudo kill -9 $(sudo lsof -t -i:8080) && nohup java $JAVA_OPTS -jar report-service-0.0.1-SNAPSHOT.jar &",
          (err, stream) => {
            if (err) {
              res_report = false;
              res.status(500).send("Report restart failed.");
              return conn.end();
            }

            stream
              .on("close", (code, signal) => {
                console.log(`Stream :: Close :: Code: ${code}, Signal: ${signal}`);
                conn.end();
                res_report = false;
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
        privateKey: fs.readFileSync(path.resolve(__dirname, "./res-ser-key.pem")),
      });
  } catch (error) {
    console.error(error);
    res_report = false;
    res.status(500).send("Report restart failed.");
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Restart and Report API!");
});

app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});

module.exports = app;
