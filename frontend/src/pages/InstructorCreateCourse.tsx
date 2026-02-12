import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { apiFetch } from "../lib/api";
import { isDirectImageUrl } from "../lib/media";

type CoursePayload = {
  title: string;
  description?: string;
  category?: string;
  level?: string;
  imageUrl?: string;
};

export default function InstructorCreateCoursePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Card title="Create Course" subtitle="Start a new draft course." className="w-full">
      <form
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          if (loading) return;
          setLoading(true);
          try {
            const payload: CoursePayload = { title };
            if (description.trim()) payload.description = description.trim();
            if (category.trim()) payload.category = category.trim();
            if (level.trim()) payload.level = level.trim();
            if (imageUrl.trim()) {
              if (!isDirectImageUrl(imageUrl)) {
                throw new Error("Image URL must be a direct link to jpg, png, webp, or gif");
              }
              payload.imageUrl = imageUrl.trim();
            }

            const result = await apiFetch<{ course: { id: string } }>("/instructor/courses", {
              method: "POST",
              body: JSON.stringify(payload),
            });
            navigate(`/instructor/courses/${result.course.id}`, { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create course");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Input
          type="text"
          name="title"
          label="Title"
          placeholder="Course title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <label className="grid gap-2 text-sm font-medium text-[var(--text-muted)]">
          <span className="text-[var(--text)]">Description</span>
          <textarea
            className="min-h-[100px] w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-strong)]/70 px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            name="description"
            placeholder="Short description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            type="text"
            name="category"
            label="Category"
            placeholder="e.g. Web Development"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <Input
            type="text"
            name="level"
            label="Level"
            placeholder="Beginner / Intermediate / Advanced"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          />
        </div>
        <Input
          type="url"
          name="imageUrl"
          label="Image URL"
          placeholder="https://..."
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
        />
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? "Creating..." : "Create draft"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/instructor")}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
