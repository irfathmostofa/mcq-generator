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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const token = sessionStorage.getItem(`resultToken:${slug}`);
    const cached = sessionStorage.getItem(`result:${slug}`);
    if (cached) {
      try {
        setResult(JSON.parse(cached) as ExamResult);
      } catch {
        setResult(null);
      }
    }
    if (!token) {
      setLoading(false);
      if (!cached) {
        setError("No submitted attempt found in this browser session.");
      }
      return;
    }
    setLoading(true);
    fetchAttemptResult(token)
      .then((data) => {
        setHidden(Boolean(data.hidden));
        if (data.result) {
          setResult(data.result);
          sessionStorage.setItem(`result:${slug}`, JSON.stringify(data.result));
        }
      })
      .catch((err: unknown) => {
        if (!cached) {
          setError(err instanceof Error ? err.message : "Unable to load result");
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !result ? (
          <p className="text-sm text-muted-foreground">Loading result...</p>
        ) : null}
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
