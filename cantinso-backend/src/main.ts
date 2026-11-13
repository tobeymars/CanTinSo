import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
async function bootstrap() {
 const app = await NestFactory.create(AppModule);
 app.use(helmet());
 app.setGlobalPrefix('api/v1');
 app.enableCors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','), credentials: true });
 app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
 const port = Number(process.env.PORT ?? 3000); await app.listen(port, '0.0.0.0');
 console.log(`CanTinSo API listening on http://localhost:${port}/api/v1`);
}
bootstrap();
