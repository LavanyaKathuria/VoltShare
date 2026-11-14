import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, describe, it } from "vitest";
import { makeEnv } from "./setup";

let env: RulesTestEnvironment;
beforeAll(async () => (env = await makeEnv()));
afterAll(async () => env.cleanup());

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

describe("storage: charger photos", () => {
  it("a host can upload an image to their own charger folder", async () => {
    const s = env.authenticatedContext("hostA", { host: true }).storage();
    await assertSucceeds(uploadBytes(ref(s, "chargers/hostA/c1/photo.png"), png, { contentType: "image/png" }));
  });
  it("a host cannot upload into another host's folder", async () => {
    const s = env.authenticatedContext("hostB", { host: true }).storage();
    await assertFails(uploadBytes(ref(s, "chargers/hostA/c1/evil.png"), png, { contentType: "image/png" }));
  });
  it("a renter cannot upload listing photos", async () => {
    const s = env.authenticatedContext("riya").storage();
    await assertFails(uploadBytes(ref(s, "chargers/riya/c1/photo.png"), png, { contentType: "image/png" }));
  });
  it("non-images are rejected", async () => {
    const s = env.authenticatedContext("hostA", { host: true }).storage();
    await assertFails(uploadBytes(ref(s, "chargers/hostA/c1/run.sh"), png, { contentType: "application/x-sh" }));
  });
});
