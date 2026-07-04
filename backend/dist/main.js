"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const express_1 = require("express");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const app_module_1 = require("./app.module");
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env.local') });
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.use((0, express_1.json)({ limit: '10mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '10mb' }));
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
//# sourceMappingURL=main.js.map