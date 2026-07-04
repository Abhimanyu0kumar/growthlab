import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [DatabaseModule, AuthModule],
    controllers: [BooksController],
})
export class BooksModule { }
