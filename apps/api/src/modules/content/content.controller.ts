import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentService } from './content.service';
import {
  CreatePostDto,
  UpdatePostDto,
  UpdatePostStatusDto,
  CreateIdeaDto,
  CreateProfileDto,
  CreateVersionDto,
} from './content.dto';

@ApiTags('Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content')
export class ContentController {
  constructor(private contentService: ContentService) {}

  // ─── Posts ──────────────────────────────────────────────────────────

  @Get('posts')
  getPosts(@CurrentUser() user: any, @Query() query: Record<string, string>) {
    return this.contentService.getPosts(user.organizationId, query);
  }

  @Get('posts/summary')
  getPostSummary(@CurrentUser() user: any) {
    return this.contentService.getPostSummary(user.organizationId);
  }

  @Get('posts/calendar')
  getCalendar(@CurrentUser() user: any, @Query('month') month: string) {
    const m = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    return this.contentService.getCalendar(user.organizationId, m);
  }

  @Get('posts/:id')
  getPost(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contentService.getPost(user.organizationId, id);
  }

  @Post('posts')
  createPost(@CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.contentService.createPost(user.organizationId, user.id, dto);
  }

  @Put('posts/:id')
  updatePost(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.contentService.updatePost(user.organizationId, id, dto);
  }

  @Patch('posts/:id/status')
  updatePostStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePostStatusDto) {
    return this.contentService.updatePostStatus(user.organizationId, id, user.id, dto);
  }

  @Delete('posts/:id')
  deletePost(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contentService.deletePost(user.organizationId, id);
  }

  // ─── Versions ───────────────────────────────────────────────────────

  @Post('posts/:id/versions')
  createVersion(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateVersionDto) {
    return this.contentService.createVersion(user.organizationId, id, user.id, dto);
  }

  // ─── Ideas ──────────────────────────────────────────────────────────

  @Get('ideas')
  getIdeas(@CurrentUser() user: any, @Query() query: Record<string, string>) {
    return this.contentService.getIdeas(user.organizationId, query);
  }

  @Post('ideas')
  createIdea(@CurrentUser() user: any, @Body() dto: CreateIdeaDto) {
    return this.contentService.createIdea(user.organizationId, user.id, dto);
  }

  @Patch('ideas/:id/status')
  updateIdeaStatus(@CurrentUser() user: any, @Param('id') id: string, @Body('status') status: string) {
    return this.contentService.updateIdeaStatus(user.organizationId, id, status);
  }

  @Delete('ideas/:id')
  deleteIdea(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contentService.deleteIdea(user.organizationId, id);
  }

  // ─── Profiles ───────────────────────────────────────────────────────

  @Get('profiles')
  getProfiles(@CurrentUser() user: any) {
    return this.contentService.getProfiles(user.organizationId);
  }

  @Get('profiles/:id')
  getProfile(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contentService.getProfile(user.organizationId, id);
  }

  @Post('profiles')
  createProfile(@CurrentUser() user: any, @Body() dto: CreateProfileDto) {
    return this.contentService.createProfile(user.organizationId, dto);
  }

  @Put('profiles/:id')
  updateProfile(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreateProfileDto>) {
    return this.contentService.updateProfile(user.organizationId, id, dto);
  }

  @Delete('profiles/:id')
  deleteProfile(@CurrentUser() user: any, @Param('id') id: string) {
    return this.contentService.deleteProfile(user.organizationId, id);
  }
}
