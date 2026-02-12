import { useMemo, useState } from "react";
import { resolveSafeImageUrl } from "../lib/media";

type CourseThumbnailProps = {
  title: string;
  imageUrl?: string | null;
  className?: string;
};

export default function CourseThumbnail({ title, imageUrl, className }: CourseThumbnailProps) {
  const safeUrl = useMemo(() => resolveSafeImageUrl(imageUrl), [imageUrl]);
  const [loadFailed, setLoadFailed] = useState(false);
  const showImage = Boolean(safeUrl) && !loadFailed;

  if (!showImage) {
    return (
      <div
        className={`grid aspect-square w-32 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)]/70 text-xs text-[var(--text-muted)] ${className ?? ""}`}
      >
        <span className="px-3 text-center">No thumbnail</span>
      </div>
    );
  }

  return (
    <img
      src={safeUrl ?? ""}
      alt={`${title} thumbnail`}
      loading="lazy"
      onError={() => setLoadFailed(true)}
      className={`aspect-square w-32 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border)] object-cover ${className ?? ""}`}
    />
  );
}
