import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { TrackerService } from './tracker.service';
import { AuthService } from '../auth/auth.service';

const SESSION_COOKIE_NAME = 'growth_tracker_session';

@Controller('db')
export class TrackerController {
    constructor(private readonly trackerService: TrackerService, private readonly authService: AuthService) { }

    @Get()
    async getDatabase(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        if (!token || !this.authService.verifyToken(token)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const data = await this.trackerService.getAll();
        return res.json(data);
    }

    @Post()
    async postDatabase(@Req() req: Request, @Res() res: Response, @Body() body: any) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        if (!token || !this.authService.verifyToken(token)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { action, collection, item } = body;
        if (!action || !collection || !item) {
            return res.status(400).json({ error: 'Missing parameters: action, collection, and item are required' });
        }

        try {
            const result = await this.trackerService.performAction(collection, action, item);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error?.message || 'Invalid request' });
        }
    }
}
