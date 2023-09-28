import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration, { Config } from './config/configuration';

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
        UserModule,
        TaskModule,
        AuthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
