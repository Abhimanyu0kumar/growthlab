import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { AppModule } from './app.module';

dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(cookieParser());
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

    app.enableCors({
        origin: process.env.BACKEND_CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    });

    app.setGlobalPrefix('api');

    const port = Number(process.env.PORT || 3001);
    await app.listen(port);
    console.log(`NestJS backend running on http://localhost:${port}/api`);
}

bootstrap();
