export type InstructorInfo = {
  fullName?: string | null;
  email?: string | null;
};

export function formatInstructorName(createdBy?: InstructorInfo | null): string {
  const fullName = createdBy?.fullName?.trim();
  if (fullName) {
    return fullName;
  }
  const email = createdBy?.email?.trim();
  if (email) {
    return email;
  }
  return "\u2014";
}
