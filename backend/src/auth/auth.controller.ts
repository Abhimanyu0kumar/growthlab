import { Body, Controller, Get, Post, Req, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDto } from './dto/register.dto';

const SESSION_COOKIE_NAME = 'growth_tracker_session';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async login(@Body() loginDto: LoginDto, @Res() res: Response) {
        const user = await this.authService.validateCredentials(loginDto.email, loginDto.password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = this.authService.createToken(user.id, user.email);
        res.cookie(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        return res.json({ success: true, email: user.email });
    }

    @Post('register')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
        const existingUser = await this.authService.getUserByEmail(registerDto.email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        const passwordHash = await this.authService.hashPassword(registerDto.password);
        const user = await this.authService.createUser(registerDto.email, passwordHash);

        const token = this.authService.createToken(user.id, user.email);
        res.cookie(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        return res.json({ success: true, email: user.email });
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

        const user = await this.authService.getUserById(payload.userId);
        if (!user) {
            return res.status(401).json({ authenticated: false });
        }

        const isDefaultPassword = user.id === '1' && bcrypt.compareSync('version', user.passwordHash);

        return res.json({ authenticated: true, email: payload.email, isDefaultPassword });
    }

    @Post('profile')
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async updateProfile(@Req() req: Request, @Res() res: Response, @Body() body: UpdateProfileDto) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await this.authService.getUserById(payload.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordValid = await this.authService.validateCredentials(user.email, body.currentPassword);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const newEmail = body.newEmail?.trim() || user.email;
        if (newEmail.toLowerCase() !== user.email.toLowerCase()) {
            const existingUser = await this.authService.getUserByEmail(newEmail);
            if (existingUser) {
                return res.status(400).json({ error: 'Email already taken' });
            }
        }

        const newPasswordHash = body.newPassword?.trim()
            ? await this.authService.hashPassword(body.newPassword.trim())
            : user.passwordHash;

        await this.authService.updateProfile(user.id, newEmail, newPasswordHash);
        const newToken = this.authService.createToken(user.id, newEmail);
        res.cookie(SESSION_COOKIE_NAME, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/',
        });

        return res.json({ success: true, email: newEmail });
    }
}
