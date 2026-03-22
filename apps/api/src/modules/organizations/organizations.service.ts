import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ResetOptions {
  financial: boolean;   // Contracts, Invoices, Expenses
  crm: boolean;         // Deals, Leads, Contacts, Companies, Activities
  pipeline: boolean;    // Pipelines & Stages (recreates default)
  tasks: boolean;       // Tasks & Comments
  onboarding: boolean;  // Onboardings & Templates
  categories: boolean;  // Expense Categories & Cost Centers
  tags: boolean;        // Tags & Tag Assignments
}

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
  }

  async update(id: string, data: { name?: string; logo?: string | null }) {
    return this.prisma.organization.update({ where: { id }, data });
  }

  async resetData(organizationId: string, options: ResetOptions) {
    const deleted: Record<string, number> = {};

    await this.prisma.$transaction(async (tx) => {
      // 1. Financial (must delete invoices before contracts due to FK)
      if (options.financial) {
        const inv = await tx.invoice.deleteMany({ where: { organizationId } });
        deleted['invoices'] = inv.count;
        const exp = await tx.expense.deleteMany({ where: { organizationId } });
        deleted['expenses'] = exp.count;
        const con = await tx.contract.deleteMany({ where: { organizationId } });
        deleted['contracts'] = con.count;
      }

      // 2. Categories & Cost Centers
      if (options.categories) {
        // Must clear categoryId/costCenterId from expenses first if financial wasn't deleted
        if (!options.financial) {
          await tx.expense.updateMany({
            where: { organizationId },
            data: { categoryId: null, costCenterId: null },
          });
        }
        const cat = await tx.expenseCategory.deleteMany({ where: { organizationId } });
        deleted['expenseCategories'] = cat.count;
        const cc = await tx.costCenter.deleteMany({ where: { organizationId } });
        deleted['costCenters'] = cc.count;
      }

      // 3. Tags
      if (options.tags) {
        const ta = await tx.tagAssignment.deleteMany({
          where: { tag: { organizationId } },
        });
        deleted['tagAssignments'] = ta.count;
        const t = await tx.tag.deleteMany({ where: { organizationId } });
        deleted['tags'] = t.count;
      }

      // 4. Tasks & Comments
      if (options.tasks) {
        // Comments don't have organizationId, delete via task/deal relations
        const cm = await tx.comment.deleteMany({
          where: {
            OR: [
              { task: { organizationId } },
              { deal: { organizationId } },
            ],
          },
        });
        deleted['comments'] = cm.count;
        const tk = await tx.task.deleteMany({ where: { organizationId } });
        deleted['tasks'] = tk.count;
      }

      // 5. Onboarding
      if (options.onboarding) {
        const oi = await tx.onboardingItem.deleteMany({
          where: { section: { onboarding: { organizationId } } },
        });
        deleted['onboardingItems'] = oi.count;
        const os = await tx.onboardingSection.deleteMany({
          where: { onboarding: { organizationId } },
        });
        deleted['onboardingSections'] = os.count;
        const ob = await tx.onboarding.deleteMany({ where: { organizationId } });
        deleted['onboardings'] = ob.count;

        // Templates
        const oti = await tx.onboardingTemplateItem.deleteMany({
          where: { section: { template: { organizationId } } },
        });
        deleted['templateItems'] = oti.count;
        const ots = await tx.onboardingTemplateSection.deleteMany({
          where: { template: { organizationId } },
        });
        deleted['templateSections'] = ots.count;
        const ot = await tx.onboardingTemplate.deleteMany({ where: { organizationId } });
        deleted['onboardingTemplates'] = ot.count;
      }

      // 6. CRM (must delete deals before leads/contacts/companies due to FKs)
      if (options.crm) {
        const act = await tx.activity.deleteMany({ where: { organizationId } });
        deleted['activities'] = act.count;
        const dc = await tx.dealContact.deleteMany({
          where: { deal: { organizationId } },
        });
        deleted['dealContacts'] = dc.count;
        // Clear deal FK on tasks if tasks weren't deleted
        if (!options.tasks) {
          await tx.task.updateMany({
            where: { organizationId },
            data: { dealId: null },
          });
        }
        const d = await tx.deal.deleteMany({ where: { organizationId } });
        deleted['deals'] = d.count;
        const l = await tx.lead.deleteMany({ where: { organizationId } });
        deleted['leads'] = l.count;
        const ct = await tx.contact.deleteMany({ where: { organizationId } });
        deleted['contacts'] = ct.count;
        const co = await tx.company.deleteMany({ where: { organizationId } });
        deleted['companies'] = co.count;
      }

      // 8. Pipeline (delete stages then pipelines, recreate default)
      if (options.pipeline) {
        // Must delete deals first if CRM wasn't reset
        if (!options.crm) {
          const act = await tx.activity.deleteMany({ where: { organizationId } });
          deleted['activities'] = (deleted['activities'] || 0) + act.count;
          const dc = await tx.dealContact.deleteMany({
            where: { deal: { organizationId } },
          });
          deleted['dealContacts'] = (deleted['dealContacts'] || 0) + dc.count;
          if (!options.tasks) {
            await tx.task.updateMany({
              where: { organizationId },
              data: { dealId: null },
            });
          }
          const d = await tx.deal.deleteMany({ where: { organizationId } });
          deleted['deals'] = (deleted['deals'] || 0) + d.count;
        }
        const ps = await tx.pipelineStage.deleteMany({
          where: { pipeline: { organizationId } },
        });
        deleted['pipelineStages'] = ps.count;
        const p = await tx.pipeline.deleteMany({ where: { organizationId } });
        deleted['pipelines'] = p.count;

        // Recreate default pipeline
        await tx.pipeline.create({
          data: {
            name: 'Pipeline Padrão',
            isDefault: true,
            organizationId,
            stages: {
              create: [
                { name: 'Novo Lead', position: 0, probability: 10, color: '#6366f1' },
                { name: 'Qualificação', position: 1, probability: 25, color: '#8b5cf6' },
                { name: 'Proposta', position: 2, probability: 50, color: '#a855f7' },
                { name: 'Negociação', position: 3, probability: 75, color: '#d946ef' },
                { name: 'Fechamento', position: 4, probability: 90, color: '#ec4899' },
              ],
            },
          },
        });
      }
    });

    return { message: 'Dados resetados com sucesso', deleted };
  }
}
