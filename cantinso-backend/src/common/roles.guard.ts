import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;
    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Tài khoản không có quyền thực hiện chức năng này.");
    }
    return true;
  }
}
