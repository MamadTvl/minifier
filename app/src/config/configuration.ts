export default () => ({
    mongo: {
        host: process.env.MONGO_HOST,
        port: parseInt(process.env.MONGO_PORT, 10) || 27017,
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD,
        database: process.env.MONGO_DATABASE,
        authSource: process.env.MONGO_AUTH_SOURCE,
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
        database: process.env.REDIS_DATABASE,
    },
    secret: process.env.SECRET,
    adminUser: process.env.ADMIN_USER,
    adminPassword: process.env.ADMIN_PASSWORD,
});

export interface Config {
    mongo: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        authSource: string;
    };
    redis: {
        host: string;
        port: number;
        password: string;
        database: string;
    };
    secret: string;
    adminUser: string;
    adminPassword: string;
}
