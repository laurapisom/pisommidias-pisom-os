import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingTemplatesService } from './onboarding-templates.service';
import { OnboardingTemplatesController } from './onboarding-templates.controller';

@Module({
  controllers: [OnboardingController, OnboardingTemplatesController],
  providers: [OnboardingService, OnboardingTemplatesService],
  exports: [OnboardingService, OnboardingTemplatesService],
})
export class OnboardingModule {}
