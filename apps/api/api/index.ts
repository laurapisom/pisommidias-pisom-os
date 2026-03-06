import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../src/app.module';

const server = express();

let app: any;

async function bootstrap() {
  if (!app) {
    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(server));

    nestApp.setGlobalPrefix('api/v1');

    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    nestApp.enableCors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['*'],
      credentials: true,
    });

    await nestApp.init();
    app = nestApp;
  }
  return server;
}

export default async (req: any, res: any) => {
  const instance = await bootstrap();
  instance(req, res);
};
