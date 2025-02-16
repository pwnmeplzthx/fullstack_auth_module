import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import * as cookieParser from 'cookie-parser';

import IORedis from 'ioredis';

import * as session from 'express-session';

import { RedisStore } from 'connect-redis';

import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import msFn from './libs/common/utils/ms-util';
import getBoolean from './libs/common/utils/getBoolean';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = app.get(ConfigService);
    const redis = new IORedis(config.getOrThrow<string>('REDIS_URI'));

    app.use(cookieParser(config.getOrThrow<string>('COOKIES_SECRET')));
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
        }),
    );

    app.use(
        session({
            secret: config.getOrThrow<string>('SESSION_SECRET'),
            name: config.getOrThrow<string>('SESSION_NAME'),
            resave: true,
            saveUninitialized: false,
            cookie: {
                domain: config.getOrThrow<string>('SESSION_DOMAIN'),
                maxAge: msFn(config.getOrThrow<string>('SESSION_MAX_AGE')),
                httpOnly: getBoolean(
                    config.getOrThrow<string>('SESSION_HTTP_ONLY'),
                ),
                secure: getBoolean(config.getOrThrow<string>('SESSION_SECURE')),
                sameSite: 'lax',
            },
            store: new RedisStore({
                client: redis,
                prefix: config.getOrThrow<string>('SESSION_FOLDER'),
            }),
        }),
    );

    app.enableCors({
        origin: config.getOrThrow<string>('ALLOWED_ORIGIN'),
        credentials: true,
        exposedHeaders: ['set-cookie'],
    });

    await app.listen(config.getOrThrow<number>('APPLICATION_PORT'));
}

bootstrap();
