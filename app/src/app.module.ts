import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration, { Config } from './config/configuration';
import { BullModule } from '@nestjs/bull';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            load: [configuration],
        }),
        MongooseModule.forRootAsync({
            useFactory: async (configService: ConfigService<Config>) => {
                const conf = configService.get<Config['mongo']>('mongo');
                return {
                    uri: `mongodb://${conf.host}:${conf.port}/${conf.database}`,
                    auth: {
                        username: conf.user,
                        password: conf.password,
                    },
                    authSource: conf.authSource,
                };
            },
            inject: [ConfigService],
        }),
        BullModule.forRootAsync({
            useFactory: async (configService: ConfigService<Config>) => {
                const conf = configService.get<Config['redis']>('redis');
                return {
                    prefix: 'PARSPACK',
                    redis: {
                        host: conf.host,
                        password: conf.password,
                        port: conf.port,
                        db: conf.database,
                    },
                };
            },
            inject: [ConfigService],
        }),
        UserModule,
        TaskModule,
        AuthModule,
    ],
})
export class AppModule {}
