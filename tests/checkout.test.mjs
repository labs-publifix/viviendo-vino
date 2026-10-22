// Mayoría de edad del checkout: `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOn, parseDate, todayInMexico } from "../lib/checkout/age.ts";

test("18 años se cumplen el día del cumpleaños, no antes", () => {
  assert.equal(ageOn("2008-10-22", "2026-10-22"), 18);
  assert.equal(ageOn("2008-10-23", "2026-10-22"), 17);
  assert.equal(ageOn("2008-11-01", "2026-10-22"), 17);
});

test("29 de febrero cumple el 1 de marzo en años no bisiestos", () => {
  assert.equal(ageOn("2008-02-29", "2026-02-28"), 17);
  assert.equal(ageOn("2008-02-29", "2026-03-01"), 18);
});

test("fechas inválidas no pasan", () => {
  for (const bad of ["", "2008-02-30", "2008-13-01", "08-10-22", "2008/10/22", "abc"]) {
    assert.equal(parseDate(bad), null, bad);
    assert.equal(ageOn(bad, "2026-10-22"), null, bad);
  }
});

test("hoy se calcula en la hora de la Ciudad de México", () => {
  // 03:00 UTC del 23 = 21:00 del 22 en CDMX.
  assert.equal(todayInMexico(new Date("2026-10-23T03:00:00Z")), "2026-10-22");
});
