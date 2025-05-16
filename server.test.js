const request = require("supertest");
const express = require("express");
jest.mock("ssh2");
jest.mock("./redlockInstance");

const { Client } = require("ssh2");
const redlock = require("./redlockInstance");

// Fake lock object with mocked release
const fakeLock = {
  release: jest.fn(() => Promise.resolve()),
};

// Mock redlock behavior
redlock.acquire = jest.fn(() => Promise.resolve(fakeLock));

// Mock SSH2 behavior
Client.mockImplementation(() => {
  return {
    on: function (event, callback) {
      if (event === "ready") {
        // Simulate successful SSH ready event
        setTimeout(() => callback(), 10);
      }
      return this;
    },
    exec: function (command, cb) {
      const stream = {
        on: function (evt, handler) {
          if (evt === "close") {
            // simulate command close after a short delay
            setTimeout(() => handler(0, null), 10);
          }
          return this;
        },
        stderr: {
          on: function () { return this; },
        },
      };
      cb(null, stream);
    },
    connect: function () { return this; },
    end: function () { return this; },
  };
});

// Bring in the actual app (after mocks are ready)
const app = require("./server"); // assumes server.js exports the app

describe("Restart and Report APIs", () => {
  it("should respond to /restart with success", async () => {
    const res = await request(app).get("/restart");
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/Service restarted successfully/);
    expect(redlock.acquire).toHaveBeenCalledWith(["locks:restart"], expect.any(Number));
    expect(fakeLock.release).toHaveBeenCalled();
  });

  it("should respond to /res-report with success", async () => {
    const res = await request(app).get("/res-report");
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/Report service restarted successfully/);
    expect(redlock.acquire).toHaveBeenCalledWith(["locks:res-report"], expect.any(Number));
    expect(fakeLock.release).toHaveBeenCalled();
  });

  it("should return 400 if lock is already held", async () => {
    redlock.acquire.mockRejectedValueOnce(new Error("Lock busy"));
    const res = await request(app).get("/restart");
    expect(res.statusCode).toBe(400);
    expect(res.text).toMatch(/Restart is already in progress/);
  });
});
