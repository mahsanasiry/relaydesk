import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LoadFailed({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="max-w-md space-y-3">
      <Alert tone="error" title={title}>
        Check your connection and try again.
      </Alert>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
