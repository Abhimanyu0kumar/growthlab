import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TrackerModule } from './tracker/tracker.module';
import { BooksModule } from './books/books.module';

@Module({
    imports: [DatabaseModule, AuthModule, TrackerModule, BooksModule],
})
export class AppModule { }
