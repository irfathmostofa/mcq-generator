import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RESOURCE_CATEGORIES, MAX_PDF_SIZE_BYTES } from "@/lib/constants";
import { listResources, retryProcessing, uploadResource } from "@/services/resources";
import { listSubjects } from "@/services/subjects";
import type { Resource, Subject } from "@/types";

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([listResources(), listSubjects()])
      .then(([nextResources, nextSubjects]) => {
        setResources(nextResources);
        setSubjects(nextSubjects);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load resources");
      })
      .finally(() => setLoading(false));
  }, []);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file") as File | null;
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > MAX_PDF_SIZE_BYTES) {
      setError("File exceeds 20 MB limit.");
      return;
    }
    setUploading(true);
    try {
      const resource = await uploadResource(
        {
          title: String(data.get("title") ?? file.name),
          description: String(data.get("description") ?? "") || undefined,
          subject_id: String(data.get("subject_id") ?? ""),
          category: String(data.get("category") ?? "other") as Resource["category"],
        },
        file,
      );
      form.reset();
      setResources((prev) => [resource, ...prev.filter((item) => item.id !== resource.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onRetry(id: string) {
    setError(null);
    setRetryingId(id);
    try {
      const next = await retryProcessing(id);
      setResources((prev) => prev.map((item) => (item.id === next.id ? next : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Upload PDFs. Extraction stores page-numbered chunks. Scanned PDFs are marked OCR-required."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={onUpload}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_id">Subject</Label>
              <select
                id="subject_id"
                name="subject_id"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {RESOURCE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="file">PDF file</Label>
              <Input id="file" name="file" type="file" accept="application/pdf" required />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          title="No resources"
          description="Upload previous papers, answer keys, and subject materials as separate PDFs."
        />
      ) : (
        <ul className="space-y-2">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">{resource.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {resource.original_filename} · {resource.chunk_count} chunks
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{resource.processing_status}</Badge>
                {resource.processing_status === "failed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryingId === resource.id}
                    onClick={() => void onRetry(resource.id)}
                  >
                    {retryingId === resource.id ? "Retrying..." : "Retry"}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
