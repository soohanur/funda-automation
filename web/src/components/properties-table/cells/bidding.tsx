/**
 * Inline editable Bidding Price cell. Saves to backend on Enter or
 * the green check button (visible only when value differs from
 * server). Backend then mirrors the value to Google Sheet col I via
 * a BackgroundTask.
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { propertiesApi } from "@/lib/api/properties";
import type { PropertiesTableRow } from "../types";

export function BiddingCell({ property }: { property: PropertiesTableRow }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<string>(property.bidding_price ?? "");
  const [original, setOriginal] = useState<string>(property.bidding_price ?? "");

  // Sync from prop changes (server updated, another tab edited, etc.)
  // without nuking in-flight typing.
  useEffect(() => {
    const v = property.bidding_price ?? "";
    if (v !== original) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOriginal(v);
      setValue(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.bidding_price]);

  const saveM = useMutation({
    mutationFn: (v: string) => propertiesApi.update(property.id, { bidding_price: v }),
    onSuccess: (updated) => {
      setOriginal(updated.bidding_price ?? "");
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Bidding price saved");
    },
    onError: () => toast.error("Save failed"),
  });

  const dirty = value !== original;

  return (
    <div className="flex w-full items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        className="input h-8 w-full px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (dirty) saveM.mutate(value);
          }
          if (e.key === "Escape") setValue(original);
        }}
        placeholder="€ —"
      />
      {dirty && (
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)]"
          onClick={() => saveM.mutate(value)}
          disabled={saveM.isPending}
          title="Save"
        >
          {saveM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
