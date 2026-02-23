DROP TABLE IF EXISTS "DeletionRequest";
DROP TABLE IF EXISTS "LessonProgress";
DROP TABLE IF EXISTS "Enrollment";
DROP TABLE IF EXISTS "Lesson";
DROP TABLE IF EXISTS "Course";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeletionRequestStatus') THEN
    DROP TYPE "DeletionRequestStatus";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnrollmentStatus') THEN
    DROP TYPE "EnrollmentStatus";
  END IF;
END $$;
