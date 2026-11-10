import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-8 text-center sm:p-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{APP_NAME}</h1>
      <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
        Upload PDFs, generate source-grounded MCQs, publish a public exam link,
        and export results to Excel.
      </p>
      <Button asChild>
        <Link to="/admin/login">Admin sign in</Link>
      </Button>
    </div>
  );
}
