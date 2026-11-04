import { test } from "node:test";
import assert from "node:assert/strict";
import { byCountry, countryFromLocale, matchesCountry, normalizeCountry, watchSearchUrl } from "../lib/watch.ts";

test("groups channels by country and de-duplicates", () => {
  const g = byCountry([
    { channel: "Sky Sports", country: "United Kingdom", logo: null },
    { channel: "NBC", country: "USA", logo: null },
    { channel: "sky sports ", country: "United Kingdom", logo: null },
    { channel: "TNT Sports", country: "United Kingdom", logo: null },
  ]);
  assert.deepEqual(g.map((x) => [x.country, x.channels.length]), [["United Kingdom", 2], ["United States", 1]]);
});

test("country from locale", () => {
  assert.equal(countryFromLocale("en-GB"), "United Kingdom");
  assert.equal(countryFromLocale("en_US"), "United States");
  assert.equal(countryFromLocale("en"), null);
  assert.equal(countryFromLocale(undefined), null);
});

test("country aliases", () => {
  assert.ok(matchesCountry("England", "United Kingdom"));
  assert.ok(matchesCountry("USA", "United States"));
  assert.ok(matchesCountry("france", "France"));
  assert.ok(!matchesCountry("France", "Spain"));
});

test("search url", () => {
  assert.match(watchSearchUrl("Arsenal", "Chelsea", "Ireland"), /Arsenal%20vs%20Chelsea%20where%20to%20watch%20Ireland/);
});

test("normalize country", () => {
  assert.equal(normalizeCountry("USA"), "United States");
  assert.equal(normalizeCountry("England"), "United Kingdom");
  assert.equal(normalizeCountry(" France "), "France");
});
