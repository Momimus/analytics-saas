import { EnrollmentStatus } from "@prisma/client";
import { HttpError } from "../utils/httpError.js";

export function assertEnrollmentTransitionAllowed(
  currentStatus: EnrollmentStatus,
  nextStatus: "ACTIVE" | "REVOKED"
) {
  if (currentStatus === EnrollmentStatus.REQUESTED) {
    if (nextStatus === EnrollmentStatus.ACTIVE || nextStatus === EnrollmentStatus.REVOKED) {
      return;
    }
  }

  if (currentStatus === EnrollmentStatus.ACTIVE) {
    if (nextStatus === EnrollmentStatus.REVOKED) {
      return;
    }
    throw new HttpError(409, "Enrollment is already active");
  }

  if (currentStatus === EnrollmentStatus.REVOKED) {
    throw new HttpError(409, "Enrollment is revoked and cannot be changed");
  }

  throw new HttpError(400, "Invalid enrollment state transition");
}
