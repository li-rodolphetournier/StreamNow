"use client";

import { toast, type Id, type ToastContentProps } from "react-toastify";
import { Button } from "@/components/ui/button";

export type ConfirmationToastVariant = "default" | "danger";

export interface ConfirmationToastOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationToastVariant;
}

interface ConfirmationToastProps extends ToastContentProps {
  options: ConfirmationToastOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export function confirmToast(
  options: ConfirmationToastOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    let hasResolved = false;

    const finalize = (result: boolean) => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(result);
      }
    };

    const handleConfirm = () => {
      finalize(true);
      toast.dismiss(currentToastId);
    };

    const handleCancel = () => {
      finalize(false);
      toast.dismiss(currentToastId);
    };

    const currentToastId: Id = toast(
      (toastProps) => (
        <ConfirmationToast
          {...toastProps}
          options={options}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        hideProgressBar: true,
        className:
          "max-w-sm rounded-lg border border-border bg-background text-foreground shadow-xl",
        bodyClassName: "p-0",
        position: "top-center",
        onClose: () => finalize(false),
      }
    );
  });
}

function ConfirmationToast({
  options,
  onConfirm,
  onCancel,
}: ConfirmationToastProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{options.title}</p>
        {options.description ? (
          <p className="text-xs text-muted-foreground">
            {options.description}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          {options.cancelLabel ?? "Annuler"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={options.variant === "danger" ? "destructive" : "default"}
          onClick={onConfirm}
        >
          {options.confirmLabel ?? "Confirmer"}
        </Button>
      </div>
    </div>
  );
}


