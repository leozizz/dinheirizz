import React from 'react'
import { LandingHeader } from '../landing/LandingHeader'
import { HeroSection } from '../landing/HeroSection'
import { FeaturesShowcase } from '../landing/FeaturesShowcase'
import { TechSecuritySection } from '../landing/TechSecuritySection'
import { LandingFooter } from '../landing/LandingFooter'

export interface WelcomeScreenProps {
  onGoToLogin: () => void
  onExploreDemo?: () => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGoToLogin, onExploreDemo }) => {
  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Dynamic Background Glows */}
      <div className="fixed -top-32 -left-32 w-[32rem] h-[32rem] gradient-orb-primary opacity-30 pointer-events-none rounded-full" />
      <div className="fixed top-1/2 -right-32 w-[36rem] h-[36rem] gradient-orb-accent opacity-25 pointer-events-none rounded-full" />
      <div className="fixed -bottom-32 left-1/3 w-[30rem] h-[30rem] gradient-orb-primary opacity-20 pointer-events-none rounded-full" />

      {/* Main Landing Sections */}
      <LandingHeader onGoToLogin={onGoToLogin} />

      <main className="relative z-10">
        <HeroSection onGoToLogin={onGoToLogin} onExploreDemo={onExploreDemo} />
        <FeaturesShowcase onExploreDemo={onExploreDemo} />
        <TechSecuritySection />
      </main>

      <LandingFooter onGoToLogin={onGoToLogin} />
    </div>
  )
}
