"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const register_dto_1 = require("./dto/register.dto");
const SESSION_COOKIE_NAME = 'growth_tracker_session';
let AuthController = class AuthController {
    constructor(authService) {
        this.authService = authService;
    }
    async login(loginDto, res) {
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
    async register(registerDto, res) {
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
    async logout(res) {
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        return res.json({ success: true });
    }
    async profile(req, res) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ authenticated: false });
        }
        const user = await this.authService.getUserById(payload.userId);
        if (!user) {
            return res.status(401).json({ authenticated: false });
        }
        const isDefaultPassword = user.id === '1' && bcryptjs_1.default.compareSync('version', user.passwordHash);
        return res.json({ authenticated: true, email: payload.email, isDefaultPassword });
    }
    async updateProfile(req, res, body) {
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
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "profile", null);
__decorate([
    (0, common_1.Post)('profile'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateProfile", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map