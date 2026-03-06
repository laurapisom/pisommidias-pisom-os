import { Module } from '@nestjs/common';
import { LeadsService } from './leads/leads.service';
import { LeadsController } from './leads/leads.controller';
import { ContactsService } from './contacts/contacts.service';
import { ContactsController } from './contacts/contacts.controller';
import { CompaniesService } from './companies/companies.service';
import { CompaniesController } from './companies/companies.controller';
import { DealsService } from './deals/deals.service';
import { DealsController } from './deals/deals.controller';
import { PipelinesService } from './pipelines/pipelines.service';
import { PipelinesController } from './pipelines/pipelines.controller';

@Module({
  controllers: [
    LeadsController,
    ContactsController,
    CompaniesController,
    DealsController,
    PipelinesController,
  ],
  providers: [
    LeadsService,
    ContactsService,
    CompaniesService,
    DealsService,
    PipelinesService,
  ],
  exports: [LeadsService, ContactsService, CompaniesService, DealsService, PipelinesService],
})
export class CrmModule {}
