import { SetMetadata } from '@nestjs/common';

export const GESTAO_PERMISSION_KEY = 'gestao_permission';
export const RequireGestaoPermission = (permission: string) =>
  SetMetadata(GESTAO_PERMISSION_KEY, permission);
