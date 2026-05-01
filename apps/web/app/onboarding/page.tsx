"use client"

import { OnboardingForm } from "@/components/onboarding-form"
import { GalleryVerticalEndIcon } from "lucide-react"

export default function OnboardingPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <a href="#" className="flex items-center gap-3 self-center font-bold">
          <img 
            src="/conversaflex_logo.svg" 
            alt="ConversaFlex" 
            className="h-6 w-auto brightness-0 invert"
          />
        </a>
        <OnboardingForm />
      </div>
    </div>
  )
}
