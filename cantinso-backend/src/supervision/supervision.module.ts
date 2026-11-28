import { NotificationsModule } from '../notifications/notifications.module';
import { Module } from '@nestjs/common';
import { SupervisionController } from './supervision.controller';
import { SupervisionService } from './supervision.service';
import { PublicInspectionService } from './public-inspection.service';
@Module({imports:[NotificationsModule],controllers:[SupervisionController],providers:[SupervisionService,PublicInspectionService]})
export class SupervisionModule {}
