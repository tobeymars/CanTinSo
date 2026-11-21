import { Controller, Get, Param } from '@nestjs/common';
import { DishQrService } from './dish-qr.service';

@Controller('public/dish-qr')
export class PublicDishQrController {
  constructor(private readonly qr: DishQrService) {}

  @Get(':token')
  detail(@Param('token') token: string) {
    return this.qr.publicDetail(token);
  }
}
