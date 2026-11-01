import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getDb, resetDb, addFavourite, listFavourites, setNotify, removeFavourite, markEventsSeen } from "../lib/db.ts";

beforeEach(() => { resetDb(); getDb(":memory:"); });

const arsenal = { teamId: "133604", name: "Arsenal", sport: "Soccer", league: "English Premier League" };

test("new favourites have notifications OFF", () => {
  addFavourite("u1", arsenal);
  assert.equal(listFavourites("u1")[0].notify, false);
});

test("notifications only turn on when explicitly set, and re-adding keeps the choice", () => {
  addFavourite("u1", arsenal);
  assert.equal(setNotify("u1", "133604", true), true);
  addFavourite("u1", arsenal);
  assert.equal(listFavourites("u1")[0].notify, true);
  setNotify("u1", "133604", false);
  assert.equal(listFavourites("u1")[0].notify, false);
});

test("users are isolated", () => {
  addFavourite("u1", arsenal);
  assert.equal(listFavourites("u2").length, 0);
  assert.equal(setNotify("u2", "133604", true), false);
  assert.equal(listFavourites("u1")[0].notify, false);
});

test("remove", () => {
  addFavourite("u1", arsenal);
  removeFavourite("u1", "133604");
  assert.equal(listFavourites("u1").length, 0);
});

test("seen events are reported once", () => {
  assert.deepEqual(markEventsSeen("u1", ["e1", "e2"]), ["e1", "e2"]);
  assert.deepEqual(markEventsSeen("u1", ["e2", "e3"]), ["e3"]);
});
