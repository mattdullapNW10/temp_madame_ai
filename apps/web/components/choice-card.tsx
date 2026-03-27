import { cn } from "@workspace/ui/lib/utils"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"

export interface ChoiceOption {
  value: string
  label: string
  description?: string
  preview?: string
  badge?: string
}

interface FieldChoiceCardProps {
  options: ChoiceOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  columns?: 1 | 2 | 3
}

const colClass: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
}

export function FieldChoiceCard({
  options,
  value,
  defaultValue,
  onChange,
  columns = 2,
}: FieldChoiceCardProps) {
  return (
    <RadioGroup
      value={value}
      defaultValue={defaultValue}
      onValueChange={onChange}
      className={cn("grid gap-3", colClass[columns])}
    >
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <label
            key={option.value}
            htmlFor={`option-${option.value}`}
            className={cn(
              "relative flex cursor-pointer flex-col gap-0.5 rounded-base border-2 border-border p-3",
              "shadow-shadow transition-all duration-100",
              "hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none",
              isSelected
                ? "bg-main text-main-foreground"
                : "bg-background text-foreground",
            )}
          >
            {option.badge && (
              <span className="absolute right-2 top-2 z-10 rounded-base border border-border bg-background px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
                {option.badge}
              </span>
            )}
            <span className="font-bold">{option.label}</span>
            {option.description && (
              <span className={cn("text-xs", isSelected ? "text-main-foreground/80" : "text-muted-foreground")}>
                {option.description}
              </span>
            )}
            {option.preview && (
              <span className={cn("text-xs italic", isSelected ? "text-main-foreground/80" : "text-muted-foreground")}>
                {option.preview}
              </span>
            )}
            {/* Hidden radio for accessibility */}
            <RadioGroupItem
              value={option.value}
              id={`option-${option.value}`}
              className="sr-only"
            />
          </label>
        )
      })}
    </RadioGroup>
  )
}
