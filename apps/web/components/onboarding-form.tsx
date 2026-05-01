"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@workspace/ui/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Label } from "@workspace/ui/components/label"
import { Button } from "@workspace/ui/components/ui/button"

const INTERFACE_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
]

const TARGET_LANGUAGES = [
  { value: "fr", label: "Français (French)" },
  { value: "es", label: "Español (Spanish)" },
  { value: "en", label: "English (US)" },
]

const LEVELS = [
  { value: "1", label: "A1 - Beginner" },
  { value: "2", label: "A2 - Elementary" },
  { value: "3", label: "B1 - Intermediate" },
  { value: "4", label: "B2 - Upper Intermediate" },
  { value: "5", label: "C1 - Advanced" },
  { value: "6", label: "C2 - Mastery" },
]

const AGE_OPTIONS = [
  { value: "adult", label: "Adult (18+)" },
  { value: "minor", label: "Minor (Under 18)" },
]

const PRONOUNS = [
  { value: "he", label: "He/Him" },
  { value: "she", label: "She/Her" },
  { value: "they", label: "They/Them" },
  { value: "neutral", label: "Prefer not to say" },
]

const OBJECTIVES = [
  { value: "client-meetings", label: "Client meetings" },
  { value: "negotiations", label: "Negotiations" },
  { value: "presentations", label: "Presentations" },
  { value: "written-comms", label: "Written comms" },
  { value: "calls", label: "Calls & video" },
  { value: "team-collab", label: "Team collaboration" },
  { value: "leadership", label: "Leadership" },
  { value: "networking", label: "Networking" },
]

export function OnboardingForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    language: "en",
    targetLanguage: "fr",
    level: "3",
    age: "adult",
    pronoun: "he",
    objective: "client-meetings",
  })

  const handleContinue = () => {
    // Save to localStorage
    localStorage.setItem("language", formData.language)
    localStorage.setItem("targetLanguage", formData.targetLanguage)
    localStorage.setItem("level", formData.level)
    localStorage.setItem("age", formData.age)
    localStorage.setItem("pronoun", formData.pronoun)
    localStorage.setItem("objective", formData.objective)
    localStorage.setItem("hasCompletedOnboarding", "true")
    
    router.push("/")
  }

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-base border-2 border-border bg-secondary-background shadow-shadow p-8">
        <div className="mb-8 space-y-2 text-center">
          <h2 className="font-heading text-2xl uppercase tracking-tight">Welcome to Madame AI</h2>
          <p className="text-sm text-muted-foreground font-base">Let's set up your learning profile</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label className="font-base font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Interface Language</Label>
            <Select value={formData.language} onValueChange={(val) => updateField("language", val)}>
              <SelectTrigger className="w-full bg-background text-foreground border-2 border-border shadow-shadow">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-2 border-border shadow-shadow">
                {INTERFACE_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-base font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Language to Learn</Label>
            <Select value={formData.targetLanguage} onValueChange={(val) => updateField("targetLanguage", val)}>
              <SelectTrigger className="w-full bg-background text-foreground border-2 border-border shadow-shadow">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-2 border-border shadow-shadow">
                {TARGET_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-base font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Current Level</Label>
            <Select value={formData.level} onValueChange={(val) => updateField("level", val)}>
              <SelectTrigger className="w-full bg-background text-foreground border-2 border-border shadow-shadow">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-2 border-border shadow-shadow">
                {LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-base font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Age Group</Label>
            <Select value={formData.age} onValueChange={(val) => updateField("age", val)}>
              <SelectTrigger className="w-full bg-background text-foreground border-2 border-border shadow-shadow">
                <SelectValue placeholder="Select age" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-2 border-border shadow-shadow">
                {AGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-base font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Preferred Pronouns</Label>
            <Select value={formData.pronoun} onValueChange={(val) => updateField("pronoun", val)}>
              <SelectTrigger className="w-full bg-background text-foreground border-2 border-border shadow-shadow">
                <SelectValue placeholder="Select pronoun" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-2 border-border shadow-shadow">
                {PRONOUNS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-base font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">Learning Objective</Label>
            <Select value={formData.objective} onValueChange={(val) => updateField("objective", val)}>
              <SelectTrigger className="w-full bg-background text-foreground border-2 border-border shadow-shadow">
                <SelectValue placeholder="Select objective" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-2 border-border shadow-shadow">
                {OBJECTIVES.map((obj) => (
                  <SelectItem key={obj.value} value={obj.value}>
                    {obj.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-10">
          <Button 
            onClick={handleContinue}
            className="w-full h-12 font-sans font-medium text-lg uppercase tracking-widest bg-main text-main-foreground border-2 border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
