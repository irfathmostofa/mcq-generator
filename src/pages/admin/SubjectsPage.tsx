import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createSubject,
  createTopic,
  listSubjects,
  listTopics,
} from "@/services/subjects";
import type { Subject, Topic } from "@/types";

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);

  const refresh = useCallback(async () => {
    const next = await listSubjects();
    setSubjects(next);
    setSelectedSubject((current) => current || next[0]?.id || "");
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load subjects");
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!selectedSubject) {
      setTopics([]);
      return;
    }
    let cancelled = false;
    setTopicsLoading(true);
    listTopics(selectedSubject)
      .then((next) => {
        if (!cancelled) setTopics(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load topics");
        }
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSubject]);

  async function onCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    if (name.length < 2) {
      setError("Subject name must be at least 2 characters.");
      return;
    }
    setError(null);
    setSavingSubject(true);
    try {
      const created = await createSubject({
        name,
        description: description || undefined,
      });
      form.reset();
      setSubjects((prev) => {
        if (prev.some((item) => item.id === created.id)) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedSubject((current) => current || created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create subject");
    } finally {
      setSavingSubject(false);
    }
  }

  async function onCreateTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubject) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("topic_name") ?? "").trim();
    if (name.length < 2) {
      setError("Topic name must be at least 2 characters.");
      return;
    }
    setError(null);
    setSavingTopic(true);
    try {
      const created = await createTopic({
        subject_id: selectedSubject,
        name,
      });
      form.reset();
      setTopics((prev) => {
        if (prev.some((item) => item.id === created.id)) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setSavingTopic(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Subjects and topics"
        description="Create subjects dynamically. Topics nest under a subject."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New subject</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreateSubject}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" />
              </div>
              <Button type="submit" disabled={savingSubject}>
                {savingSubject ? "Creating..." : "Create subject"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New topic</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onCreateTopic}>
              <div className="space-y-2">
                <Label htmlFor="topic_name">Name</Label>
                <Input id="topic_name" name="topic_name" required />
              </div>
              <Button type="submit" disabled={!selectedSubject || savingTopic}>
                {savingTopic ? "Creating..." : "Create topic"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Subjects</h2>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : subjects.length === 0 ? (
            <EmptyState
              title="No subjects"
              description="Add Bangladesh Affairs, English, Mathematics, or any custom subject."
            />
          ) : (
            <ul className="space-y-2">
              {subjects.map((subject) => (
                <li key={subject.id}>
                  <button
                    type="button"
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm ${
                      selectedSubject === subject.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedSubject(subject.id)}
                  >
                    {subject.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Topics</h2>
          {topicsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : topics.length === 0 ? (
            <EmptyState
              title="No topics"
              description="Select a subject and add topics such as Liberation War or Algebra."
            />
          ) : (
            <ul className="space-y-2">
              {topics.map((topic) => (
                <li key={topic.id} className="rounded-lg border px-4 py-3 text-sm">
                  {topic.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
