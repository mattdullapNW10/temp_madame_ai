"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { FieldChoiceCard, type ChoiceOption } from "@/components/choice-card"

interface StepConfig {
  id: number
  label: string
  title: string
  description?: string
  options: ChoiceOption[]
  columns?: 1 | 2 | 3
  defaultValue?: string
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    label: "Interface Language",
    title: "Select your language",
    description: "Choose the language you'll use to navigate the app.",
    options: [
      { value: "en", label: "English", description: "English" },
      { value: "es", label: "Español", description: "Spanish" },
      { value: "zh", label: "中文", description: "Mandarin" },
      { value: "zh-tw", label: "Traditional Chinese", description: "Traditional Chinese" },
      { value: "de", label: "Deutsch", description: "German" },
      { value: "ar", label: "العربية", description: "Arabic" },
      { value: "pt", label: "Português", description: "Portuguese" },
      { value: "hi", label: "हिन्दी", description: "Hindi" },
      { value: "it", label: "Italiano", description: "Italian" },
      { value: "vi", label: "Tiếng Việt", description: "Vietnamese" },
      { value: "pl", label: "Polski", description: "Polish" },
      { value: "tr", label: "Türkçe", description: "Turkish" },
      { value: "fr", label: "Français", description: "French" },
    ],
    columns: 2,
    defaultValue: "en",
  },
  {
    id: 2,
    label: "Target Language",
    title: "What language do you want to learn?",
    description: "Choose the language you want to learn. You'll hear a greeting to preview how it sounds.",
    options: [
      { value: "fr", label: "Français", description: "French", preview: "Bonjour!" },
      { value: "es", label: "Español", description: "Spanish", preview: "¡Hola!" },
    ],
    columns: 2,
    defaultValue: "fr",
  },
  {
    id: 3,
    label: "Age",
    title: "Are you an adult?",
    description: "This helps us provide age-appropriate content.",
    options: [
      { value: "adult", label: "Yes", description: "18 years or older" },
      { value: "minor", label: "No", description: "Under 18 years" },
    ],
    columns: 2,
    defaultValue: "adult",
  },
  {
    id: 4,
    label: "Pronoun",
    title: "What are your pronouns?",
    description: "Some languages are gendered. This helps us speak to you accurately.",
    options: [
      { value: "neutral", label: "Prefer not to say", description: "Use neutral language" },
      { value: "he", label: "He/Him", description: "Masculine forms" },
      { value: "she", label: "She/Her", description: "Feminine forms" },
      { value: "they", label: "They/Them", description: "Non-binary forms" },
    ],
    columns: 2,
    defaultValue: "neutral",
  },
  {
    id: 5,
    label: "Objective",
    title: "What is your main focus at work?",
    description: "We'll build scenarios around your actual day-to-day so every session feels relevant.",
    options: [
      { value: "client-meetings", label: "Client meetings", description: "Pitches, reviews & demos" },
      { value: "negotiations", label: "Negotiations", description: "Deals, contracts & pricing" },
      { value: "presentations", label: "Presentations", description: "Decks, all-hands & webinars" },
      { value: "written-comms", label: "Written comms", description: "Emails, reports & proposals" },
      { value: "calls", label: "Calls & video", description: "Phone, Teams & Zoom etiquette" },
      { value: "team-collab", label: "Team collaboration", description: "Stand-ups, retros & 1-on-1s" },
      { value: "leadership", label: "Leadership", description: "Managing & motivating teams" },
      { value: "networking", label: "Networking", description: "Conferences, events & small talk" },
    ],
    columns: 2,
    defaultValue: "client-meetings",
  },
  {
    id: 6,
    label: "Style",
    title: "What's your preferred learning style?",
    description: "We'll customize content to match how you learn best.",
    options: [
      { value: "visual", label: "Visual", description: "Images & videos" },
      { value: "audio", label: "Audio", description: "Listening & speaking" },
      { value: "reading", label: "Reading", description: "Text & writing" },
      { value: "mixed", label: "Mixed", description: "A bit of everything" },
    ],
    columns: 2,
    defaultValue: "mixed",
  },
  {
    id: 7,
    label: "Level",
    title: "What is your current level?",
    description: "Select your proficiency level using the CEFR scale.",
    options: [
      { value: "a1", label: "A1", description: "Complete beginner" },
      { value: "a2", label: "A2", description: "Basic phrases & simple conversations" },
      { value: "b1", label: "B1", description: "Can discuss familiar topics" },
      { value: "b2", label: "B2", description: "Can interact with native speakers" },
      { value: "c1", label: "C1", description: "Fluent for social & professional use" },
      { value: "c2", label: "C2", description: "Near-native proficiency" },
    ],
    columns: 2,
    defaultValue: "a1",
  },
]

export function OnboardingForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<Record<number, string>>(
    Object.fromEntries(STEPS.map((s) => [s.id, s.defaultValue ?? ""]))
  )

  const progress = Math.round((currentStep / STEPS.length) * 100)

  const handleNext = () => {
    if (currentStep === STEPS.length) {
      router.push("/")
    } else {
      setCurrentStep((s) => s + 1)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Card */}
      <div className="rounded-base border-2 border-border bg-secondary-background shadow-shadow">
        {/* Content */}
        <div className="p-6">
          <div className="grid">
            {STEPS.map((s) => {
              const isActive = s.id === currentStep
              return (
                <div
                  key={s.id}
                  aria-hidden={!isActive}
                  className={cn(
                    "col-start-1 row-start-1 transition-opacity duration-200",
                    !isActive && "pointer-events-none select-none opacity-0"
                  )}
                >
                  <div className="mb-6 text-center">
                    <h2 className="font-heading text-xl font-bold uppercase tracking-tight">{s.title}</h2>
                    {s.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                  <FieldChoiceCard
                    options={s.options}
                    columns={s.columns}
                    value={answers[s.id]}
                    onChange={(val) =>
                      setAnswers((prev) => ({ ...prev, [s.id]: val }))
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-4 border-t-2 border-border p-6">
          {/* Navigation */}
          <div className="flex w-full items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
              disabled={currentStep === 1}
              className={cn(
                "flex items-center gap-1.5 rounded-base border-2 border-border bg-background px-4 py-2",
                "font-mono text-xs font-bold uppercase tracking-wider shadow-shadow",
                "transition-all duration-100 hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none",
                "disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              <ChevronLeft className="size-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className={cn(
                "flex items-center gap-1.5 rounded-base border-2 border-border bg-main px-4 py-2",
                "font-mono text-xs font-bold uppercase tracking-wider text-main-foreground shadow-shadow",
                "transition-all duration-100 hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none",
              )}
            >
              {currentStep === STEPS.length ? "Finish" : "Next"}
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex w-full flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono text-xs font-bold text-muted-foreground">
              <span>Step {currentStep} of {STEPS.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-base border-2 border-border bg-background">
              <div
                className="h-full rounded-base bg-main transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
