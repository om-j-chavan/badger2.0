"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/action-result";

interface RunOptions {
  successMessage?: string;
  onSuccess?: () => void;
}

/**
 * Wraps a server action call with pending state, toast feedback, field errors,
 * and an automatic router.refresh() on success.
 */
export function useAction() {
  const [pending, setPending] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[] | undefined>>({});
  const { toast } = useToast();
  const router = useRouter();

  const run = React.useCallback(
    async <T>(
      action: () => Promise<ActionResult<T>>,
      opts: RunOptions = {},
    ): Promise<ActionResult<T>> => {
      setPending(true);
      setFieldErrors({});
      try {
        const result = await action();
        if (result.ok) {
          if (opts.successMessage) toast({ title: opts.successMessage, variant: "success" });
          opts.onSuccess?.();
          router.refresh();
        } else {
          setFieldErrors(result.fieldErrors ?? {});
          toast({ title: result.error, variant: "error" });
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        toast({ title: message, variant: "error" });
        return { ok: false, error: message };
      } finally {
        setPending(false);
      }
    },
    [router, toast],
  );

  return { run, pending, fieldErrors };
}
