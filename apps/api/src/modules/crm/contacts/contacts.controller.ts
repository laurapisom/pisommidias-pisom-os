import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ContactsService } from './contacts.service';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar contato' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.contactsService.create(user.organizationId, body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contatos' })
  findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.contactsService.findAll(user.organizationId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do contato' })
  findById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contactsService.findById(user.organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar contato' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.contactsService.update(user.organizationId, id, body);
  }
}
