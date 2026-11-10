import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { participantSchema } from "@/lib/validations";
import { fetchPublicExam, startExam, type PublicExam } from "@/services/public-exam";

export function ExamLandingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<PublicExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetchPublicExam(slug)
      .then((data) => setExam(data.exam))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Examination not available");
      });
  }, [slug]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug) return;
    const form = new FormData(event.currentTarget);
    const parsed = participantSchema.safeParse({
      full_name: form.get("full_name"),
      email: form.get("email"),
      phone: form.get("phone"),
    });
    if (!parsed.success) {
      setError("Enter a valid name, email, and phone number.");
      return;
    }
    setPending(true);
    try {
      const attempt = await startExam(slug, parsed.data);
      sessionStorage.setItem(
        `attempt:${slug}`,
        JSON.stringify({
          accessToken: attempt.access_token,
          deadlineAt: attempt.deadline_at,
          questions: attempt.questions,
          exam: attempt.exam,
        }),
      );
      navigate(`/exam/${slug}/take`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start exam");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="break-words text-xl sm:text-2xl">
          {exam?.title ?? "Start examination"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {exam ? (
          <div className="mb-4 space-y-1 text-sm text-muted-foreground">
            <p>{exam.description || "No account required."}</p>
            <p>
              {exam.total_questions} questions · {exam.total_marks} marks
              {exam.time_limit_minutes
                ? ` · ${exam.time_limit_minutes} minutes`
                : ""}
            </p>
            {exam.instructions ? <p>{exam.instructions}</p> : null}
          </div>
        ) : null}
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" required />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button className="w-full sm:w-auto" type="submit" disabled={pending || !exam}>
            {pending ? "Starting..." : "Start exam"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
