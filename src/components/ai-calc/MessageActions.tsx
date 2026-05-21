import { useState } from "react";
import { Copy, Check, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  role: "user" | "assistant";
  onRegenerate?: () => void;
  onEdit?: () => void;
};

export default function MessageActions({ text, role, onRegenerate, onEdit }: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Не удалось скопировать"); }
  };
  return (
    <div className={cn(
      "flex items-center gap-0.5 mt-1.5 transition-opacity",
      "opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100",
      "md:opacity-0 max-md:opacity-100",
    )}>
      {text && (
        <button
          type="button"
          onClick={copy}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Копировать"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      {role === "assistant" && onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Сгенерировать заново"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
      {role === "user" && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Редактировать"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}