import { api } from "@/lib/api";
import type { Subject, Topic } from "@/types";
import type { SubjectInput, TopicInput } from "@/lib/validations";

export function listSubjects() {
  return api<Subject[]>("/api/subjects");
}

export function createSubject(input: SubjectInput) {
  return api<Subject>("/api/subjects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSubject(id: string, input: Partial<SubjectInput>) {
  return api<Subject>(`/api/subjects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSubject(id: string) {
  return api<void>(`/api/subjects/${id}`, { method: "DELETE" });
}

export function listTopics(subjectId: string) {
  return api<Topic[]>(`/api/topics?subject_id=${encodeURIComponent(subjectId)}`);
}

export function createTopic(input: TopicInput) {
  return api<Topic>("/api/topics", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteTopic(id: string) {
  return api<void>(`/api/topics/${id}`, { method: "DELETE" });
}
