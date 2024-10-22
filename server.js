const express = require("express");
const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
let called = false;

app.get("/restart", (req, res) => {
  const conn = new Client();

  if (called) {
    res
      .status(400)
      .send("Service is already being restarted. Please try again later.");
    return;
  }
  called = true;

  try {
    conn
      .on("ready", () => {
        console.log("SSH Client :: Ready");
        conn.exec("cd api && sudo yarn run build:prod", (err, stream) => {
          if (err) {
            res.status(500).send("Service restart failed.");
            called = false;
            return conn.end();
          }

          stream
            .on("close", (code, signal) => {
              console.log(
                `Stream :: Close :: Code: ${code}, Signal: ${signal}`
              );
              conn.end();
              res.status(200).send("Service restarted successfully.");
              called = false;
            })
            .on("data", (data) => {
              console.log(`STDOUT: ${data}`);
            })
            .stderr.on("data", (data) => {
              console.error(`STDERR: ${data}`);
            });
        });
      })
      .connect({
        host: "ec2-44-199-44-200.compute-1.amazonaws.com",
        port: 22,
        username: "ubuntu",
        privateKey: fs.readFileSync(path.resolve(__dirname, "./ubuntu.pem")),
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Service restart failed.");
    called = false;
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
