import { Module } from '@nestjs/common';
import { SupervisionController } from './supervision.controller';
import { SupervisionService } from './supervision.service';
import { PublicInspectionService } from './public-inspection.service';
@Module({controllers:[SupervisionController],providers:[SupervisionService,PublicInspectionService]})
export class SupervisionModule {}
