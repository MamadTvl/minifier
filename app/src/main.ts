import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as mongoose from 'mongoose';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    const config = new DocumentBuilder()
        .setTitle('Parspack Test')
        .setDescription('API description')
        .setVersion('1.0')
        .addBearerAuth(
            {
                bearerFormat: 'Bearer ',
                type: 'http',
                name: 'authorization',
                in: 'header',
            },
            'user-auth',
        )
        .build();
    const document = SwaggerModule.createDocument(app, config, {
        deepScanRoutes: true,
    });
    SwaggerModule.setup('doc', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
    await app.listen(3000);
    mongoose.set('debug', true);
}
bootstrap();
