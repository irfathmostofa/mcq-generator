import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAttemptResult } from "@/services/public-exam";
import type { ExamResult } from "@/types";

export function ExamResultPage() {
  const { slug } = useParams();
  const [hidden, setHidden] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const token = sessionStorage.getItem(`resultToken:${slug}`);
    if (!token) {
      setError("No submitted attempt found in this browser session.");
      return;
    }
    fetchAttemptResult(token)
      .then((data) => {
        setHidden(Boolean(data.hidden));
        setResult(data.result ?? null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load result");
      });
  }, [slug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {hidden ? (
          <p className="text-sm text-muted-foreground">
            Results are hidden by the examination settings.
          </p>
        ) : null}
        {result && !hidden ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Correct</dt>
              <dd className="font-medium">{result.correct_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Incorrect</dt>
              <dd className="font-medium">{result.incorrect_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Unanswered</dt>
              <dd className="font-medium">{result.unanswered_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Marks</dt>
              <dd className="font-medium">
                {result.obtained_marks}/{result.total_marks}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Percentage</dt>
              <dd className="font-medium">{result.percentage}%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Rank</dt>
              <dd className="font-medium">{result.rank ?? "-"}</dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
