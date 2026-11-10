import { api } from "@/lib/api";
import type { Resource } from "@/types";
import type { ResourceUploadInput } from "@/lib/validations";

export function listResources(filters?: {
  subject_id?: string;
  topic_id?: string;
  category?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.subject_id) params.set("subject_id", filters.subject_id);
  if (filters?.topic_id) params.set("topic_id", filters.topic_id);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString();
  return api<Resource[]>(`/api/resources${query ? `?${query}` : ""}`);
}

export function uploadResource(input: ResourceUploadInput, file: File) {
  const form = new FormData();
  form.set("title", input.title);
  if (input.description) form.set("description", input.description);
  form.set("subject_id", input.subject_id);
  if (input.topic_id) form.set("topic_id", input.topic_id);
  form.set("category", input.category);
  form.set("file", file);
  return api<Resource>("/api/resources", { method: "POST", body: form });
}

export function retryProcessing(resourceId: string) {
  return api<Resource>(`/api/resources/${resourceId}/retry`, { method: "POST" });
}
