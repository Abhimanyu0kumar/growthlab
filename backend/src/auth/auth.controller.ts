import { Body, Controller, Get, Post, Req, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const SESSION_COOKIE_NAME = 'growth_tracker_session';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async login(@Body() loginDto: LoginDto, @Res() res: Response) {
        const admin = await this.authService.getAdmin();
        if (!admin) {
            return res.status(500).json({ error: 'Authentication service unavailable' });
        }

        const isPasswordValid = await this.authService.validateCredentials(loginDto.username, loginDto.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = this.authService.createToken(admin.username);
        res.cookie(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        return res.json({ success: true, username: admin.username });
    }

    @Post('logout')
    async logout(@Res() res: Response) {
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        return res.json({ success: true });
    }

    @Get('profile')
    async profile(@Req() req: Request, @Res() res: Response) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ authenticated: false });
        }

        const admin = await this.authService.getAdmin();
        if (!admin) {
            return res.status(500).json({ error: 'Authentication service unavailable' });
        }

        const isDefaultPassword = bcrypt.compareSync('version', admin.passwordHash);

        return res.json({ authenticated: true, username: payload.username, isDefaultPassword });
    }

    @Post('profile')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async updateProfile(@Req() req: Request, @Res() res: Response, @Body() body: UpdateProfileDto) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const admin = await this.authService.getAdmin();
        if (!admin) {
            return res.status(500).json({ error: 'Authentication service unavailable' });
        }

        const isPasswordValid = await this.authService.validateCredentials(admin.username, body.currentPassword);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const newUsername = body.newUsername?.trim() || admin.username;
        const newPasswordHash = body.newPassword?.trim()
            ? await this.authService.hashPassword(body.newPassword.trim())
            : admin.passwordHash;

        await this.authService.updateProfile(newUsername, newPasswordHash);
        const newToken = this.authService.createToken(newUsername);
        res.cookie(SESSION_COOKIE_NAME, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        return res.json({ success: true, username: newUsername });
    }
}
