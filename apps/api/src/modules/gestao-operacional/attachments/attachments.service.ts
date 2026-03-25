import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async create(cardId: string, userId: string, data: {
    name: string; driveFileId?: string; driveUrl?: string; mimeType?: string; sizeBytes?: number;
  }) {
    return this.prisma.boardCardAttachment.create({
      data: { cardId, uploadedById: userId, ...data },
    });
  }

  async delete(attachmentId: string, userId: string) {
    const att = await this.prisma.boardCardAttachment.findUnique({ where: { id: attachmentId } });
    if (!att) throw new NotFoundException('Anexo não encontrado');
    if (att.uploadedById !== userId) throw new ForbiddenException('Sem permissão para excluir este anexo');
    return this.prisma.boardCardAttachment.delete({ where: { id: attachmentId } });
  }
}
