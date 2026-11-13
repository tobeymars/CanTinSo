import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export interface AuthUser { sub: string; email: string; role: string; schoolId: string | null }
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
