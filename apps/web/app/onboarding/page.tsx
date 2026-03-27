"use client"

import { OnboardingForm } from "@/components/onboarding-form"
import { GalleryVerticalEndIcon } from "lucide-react"

export default function OnboardingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-bold">
          <div className="flex size-7 items-center justify-center rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          <span className="font-mono text-sm font-bold uppercase tracking-wider">Acme Inc.</span>
        </a>
        <OnboardingForm />
      </div>
    </div>
  )
}
