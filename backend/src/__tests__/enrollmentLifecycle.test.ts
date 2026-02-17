import { assertEnrollmentTransitionAllowed } from "../services/enrollmentLifecycle.js";

describe("assertEnrollmentTransitionAllowed", () => {
  it("allows REQUESTED -> ACTIVE and ACTIVE -> REVOKED", () => {
    expect(() =>
      assertEnrollmentTransitionAllowed("REQUESTED", "ACTIVE")
    ).not.toThrow();

    expect(() =>
      assertEnrollmentTransitionAllowed("ACTIVE", "REVOKED")
    ).not.toThrow();
  });
});
