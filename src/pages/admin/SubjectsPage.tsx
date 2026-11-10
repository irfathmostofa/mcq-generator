import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  async function refresh() {
    const next = await listSubjects();
    setSubjects(next);
    if (next[0] && !selectedSubject) setSelectedSubject(next[0].id);
  }

  useEffect(() => {
    refresh().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load subjects");
    });
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    listTopics(selectedSubject)
      .then(setTopics)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load topics");
      });
  }, [selectedSubject]);

  async function onCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createSubject({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? "") || undefined,
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function onCreateTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubject) return;
    const form = new FormData(event.currentTarget);
    await createTopic({
      subject_id: selectedSubject,
      name: String(form.get("topic_name") ?? ""),
    });
    event.currentTarget.reset();
    setTopics(await listTopics(selectedSubject));
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
              <Button type="submit">Create subject</Button>
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
              <Button type="submit" disabled={!selectedSubject}>
                Create topic
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Subjects</h2>
          {subjects.length === 0 ? (
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
          {topics.length === 0 ? (
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
