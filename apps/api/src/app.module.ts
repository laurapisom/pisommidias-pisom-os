import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CrmModule } from './modules/crm/crm.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { FinancialModule } from './modules/financial/financial.module';
import { ContentModule } from './modules/content/content.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CrmModule,
    TasksModule,
    OnboardingModule,
    FinancialModule,
    ContentModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
