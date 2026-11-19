import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { MealPlansService } from './meal-plans.service';

@Controller('meal-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MealPlansController {
  constructor(private readonly mealPlans: MealPlansService) {}

  @Get('age-groups')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN', 'SCHOOL_ADMIN', 'UBND_ADMIN')
  ageGroups() { return this.mealPlans.listAgeGroups(); }

  @Get()
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN', 'SCHOOL_ADMIN', 'UBND_ADMIN')
  list(@CurrentUser() user: AuthUser) { return this.mealPlans.list(user); }

  @Post()
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.mealPlans.create(user, body);
  }

  @Post(':revisionId/submit')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  submit(@CurrentUser() user: AuthUser, @Param('revisionId') revisionId: string) {
    return this.mealPlans.submit(user, revisionId);
  }

  @Post(':revisionId/approve')
  @Roles('SCHOOL_ADMIN')
  approve(@CurrentUser() user: AuthUser, @Param('revisionId') revisionId: string, @Body() body: { note?: string }) {
    return this.mealPlans.decide(user, revisionId, 'APPROVED', body?.note);
  }

  @Post(':revisionId/return')
  @Roles('SCHOOL_ADMIN')
  returnRevision(@CurrentUser() user: AuthUser, @Param('revisionId') revisionId: string, @Body() body: { note?: string }) {
    return this.mealPlans.decide(user, revisionId, 'RETURNED', body?.note);
  }
}
