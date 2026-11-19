import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateDishDto } from './dto/create-dish.dto';
import { CreateDishVersionDto } from './dto/create-dish-version.dto';
import { PreviewDishNutritionDto } from './dto/preview-dish-nutrition.dto';
import { DishDecisionDto } from './dto/dish-decision.dto';
import { SubmitDishVersionDto } from './dto/submit-dish-version.dto';
import { DishesService } from './dishes.service';

@Controller('dishes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DishesController {
  constructor(private readonly dishes: DishesService) {}

  @Post()
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDishDto) {
    return this.dishes.create(user, dto);
  }

  @Get()
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  list(@CurrentUser() user: AuthUser) {
    return this.dishes.listForKitchen(user);
  }

  @Get('pending-approvals')
  @Roles('SCHOOL_ADMIN')
  pendingApprovals(@CurrentUser() user: AuthUser) {
    return this.dishes.pendingApprovals(user);
  }

  @Get(':dishId')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  getOne(@CurrentUser() user: AuthUser, @Param('dishId') dishId: string) {
    return this.dishes.getOneForKitchen(user, dishId);
  }

  @Post(':dishId/versions')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  createVersion(
    @CurrentUser() user: AuthUser,
    @Param('dishId') dishId: string,
    @Body() dto: CreateDishVersionDto,
  ) {
    return this.dishes.createVersion(user, dishId, dto);
  }

  @Post(':dishId/versions/:versionId/submit')
  @Roles('CENTRAL_KITCHEN', 'SCHOOL_KITCHEN')
  submitVersion(
    @CurrentUser() user: AuthUser,
    @Param('dishId') dishId: string,
    @Param('versionId') versionId: string,
    @Body() dto: SubmitDishVersionDto,
  ) {
    return this.dishes.submitVersion(user, dishId, versionId, dto.schoolIds);
  }

  @Post('approvals/:approvalId/approve')
  @Roles('SCHOOL_ADMIN')
  approve(
    @CurrentUser() user: AuthUser,
    @Param('approvalId') approvalId: string,
    @Body() dto: DishDecisionDto,
  ) {
    return this.dishes.decideApproval(user, approvalId, 'APPROVED', dto.reason);
  }

  @Post('approvals/:approvalId/return')
  @Roles('SCHOOL_ADMIN')
  returnForChanges(
    @CurrentUser() user: AuthUser,
    @Param('approvalId') approvalId: string,
    @Body() dto: DishDecisionDto,
  ) {
    return this.dishes.decideApproval(user, approvalId, 'RETURNED', dto.reason);
  }
}
