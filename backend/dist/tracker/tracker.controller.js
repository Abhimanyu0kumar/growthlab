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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackerController = void 0;
const common_1 = require("@nestjs/common");
const tracker_service_1 = require("./tracker.service");
const auth_service_1 = require("../auth/auth.service");
const SESSION_COOKIE_NAME = 'growth_tracker_session';
let TrackerController = class TrackerController {
    constructor(trackerService, authService) {
        this.trackerService = trackerService;
        this.authService = authService;
    }
    async getDatabase(req, res) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const data = await this.trackerService.getAll(payload.userId);
        return res.json(data);
    }
    async postDatabase(req, res, body) {
        const token = req.cookies[SESSION_COOKIE_NAME];
        const payload = token ? this.authService.verifyToken(token) : null;
        if (!payload) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { action, collection, item } = body;
        if (!action || !collection || !item) {
            return res.status(400).json({ error: 'Missing parameters: action, collection, and item are required' });
        }
        try {
            const result = await this.trackerService.performAction(payload.userId, collection, action, item);
            return res.json(result);
        }
        catch (error) {
            return res.status(400).json({ error: error?.message || 'Invalid request' });
        }
    }
};
exports.TrackerController = TrackerController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TrackerController.prototype, "getDatabase", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], TrackerController.prototype, "postDatabase", null);
exports.TrackerController = TrackerController = __decorate([
    (0, common_1.Controller)('db'),
    __metadata("design:paramtypes", [tracker_service_1.TrackerService, auth_service_1.AuthService])
], TrackerController);
//# sourceMappingURL=tracker.controller.js.map