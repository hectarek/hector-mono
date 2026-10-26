"use client";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { deleteCompany } from "@/app/actions/companies";
import type { CompanyRef } from "@/src/entities/models/company.model";

// Deleting a company, which asks first (R21: Hector's alone, and the server refuses anyone else).
// Deleted, it goes back to the companies.
export function DeleteCompanyButton({ company }: { company: CompanyRef }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await callAction(() => deleteCompany({ id: company.id }));
      if (result.ok) {
        router.push("/companies");
        return;
      }
      setError(result.message);
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="destructive" size="lg" className="min-h-11" />}
      >
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {company.name}?</DialogTitle>
          <DialogDescription>
            It can&apos;t be undone. Its history stays in the log.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="secondary"
                size="lg"
                type="button"
                className="min-h-11"
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            disabled={isPending}
            onClick={confirm}
            className="min-h-11"
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
