import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generationConfigSchema } from "@/lib/validations";
import { listResources } from "@/services/resources";
import { listSubjects, listTopics } from "@/services/subjects";
import { startGeneration } from "@/services/generation";
import type { Resource, Subject, Topic } from "@/types";

export function GeneratePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalMarks, setTotalMarks] = useState(20);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);

  // One MCQ per "marks per question": 20 marks at 1 mark each => 20 MCQs.
  const questionCount =
    marksPerQuestion > 0 ? Math.round(totalMarks / marksPerQuestion) : 0;
  const marksDivideEvenly =
    marksPerQuestion > 0 && Number.isInteger(totalMarks / marksPerQuestion);

  useEffect(() => {
    listSubjects().then(setSubjects).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load subjects");
    });
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    Promise.all([listTopics(subjectId), listResources({ subject_id: subjectId })])
      .then(([nextTopics, nextResources]) => {
        setTopics(nextTopics);
        setResources(nextResources.filter((item) => item.processing_status === "processed"));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load resources");
      });
  }, [subjectId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!marksDivideEvenly || questionCount < 1) {
      setError("Total marks must be divisible by marks per question.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const topicIds = form.getAll("topic_ids").map(String);
    const resourceIds = form.getAll("resource_ids").map(String);
    const parsed = generationConfigSchema.safeParse({
      examination_title: form.get("examination_title"),
      subject_id: subjectId,
      topic_ids: topicIds,
      resource_ids: resourceIds,
      number_of_questions: questionCount,
      total_marks: totalMarks,
      marks_per_question: marksPerQuestion,
      negative_marking: Number(form.get("negative_marking")),
      difficulty_distribution: {
        easy: Number(form.get("easy")),
        medium: Number(form.get("medium")),
        hard: Number(form.get("hard")),
      },
      language: form.get("language"),
      options_per_question: 4,
      additional_instructions: String(form.get("additional_instructions") ?? "") || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid configuration");
      return;
    }
    try {
      const job = await startGeneration(parsed.data, crypto.randomUUID());
      const shortfall = questionCount - job.generated_count;
      setMessage(
        `Generated ${job.generated_count} of ${questionCount} questions (${job.uncertain_count} uncertain). ` +
          (shortfall > 0
            ? `${shortfall} short: the selected PDFs did not have enough usable text. Add more resources and generate again. `
            : "") +
          "Review them in Question Bank before publish.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Generate MCQs"
        description="Select multiple PDFs. Subject materials are the factual source. Previous papers teach patterns only. Admin review is required."
      />
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="mb-4 text-sm text-primary">{message}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>Generation configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="examination_title">Examination title</Label>
              <Input id="examination_title" name="examination_title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_id">Subject</Label>
              <select
                id="subject_id"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
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
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                name="language"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue="bn"
              >
                <option value="bn">Bangla</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Topics</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {topics.map((topic) => (
                  <label key={topic.id} className="flex items-start gap-2 text-sm">
                    <input className="mt-0.5 shrink-0" type="checkbox" name="topic_ids" value={topic.id} />
                    <span className="break-words">{topic.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Resources</Label>
              <div className="grid gap-2">
                {resources.map((resource) => (
                  <label key={resource.id} className="flex items-start gap-2 text-sm">
                    <input className="mt-0.5 shrink-0" type="checkbox" name="resource_ids" value={resource.id} />
                    <span className="break-words">
                      {resource.title} ({resource.category})
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_marks">Total marks</Label>
              <Input
                id="total_marks"
                name="total_marks"
                type="number"
                min={1}
                value={totalMarks}
                onChange={(event) => setTotalMarks(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marks_per_question">Marks per question</Label>
              <Input
                id="marks_per_question"
                name="marks_per_question"
                type="number"
                min={0.25}
                step="0.25"
                value={marksPerQuestion}
                onChange={(event) => setMarksPerQuestion(Number(event.target.value))}
              />
            </div>
            <p className="text-sm sm:col-span-2">
              {marksDivideEvenly && questionCount > 0 ? (
                <>
                  Will generate <strong>{questionCount}</strong> MCQs ({totalMarks} marks ÷{" "}
                  {marksPerQuestion} per question).
                </>
              ) : (
                <span className="text-destructive">
                  Total marks must be divisible by marks per question.
                </span>
              )}
            </p>
            <div className="space-y-2">
              <Label htmlFor="negative_marking">Negative marking</Label>
              <Input id="negative_marking" name="negative_marking" type="number" step="0.01" defaultValue={0.25} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="easy">Easy %</Label>
              <Input id="easy" name="easy" type="number" defaultValue={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medium">Medium %</Label>
              <Input id="medium" name="medium" type="number" defaultValue={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hard">Hard %</Label>
              <Input id="hard" name="hard" type="number" defaultValue={20} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="additional_instructions">Additional AI instructions</Label>
              <Textarea id="additional_instructions" name="additional_instructions" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                Generate draft questions
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
