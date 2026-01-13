import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USERS_PATTERNS } from '../../shared/contracts/message-patterns';
import { UsersServiceHandler } from './users-service.handler';

/**
 * Users Service Controller
 * Handles incoming TCP messages from other microservices
 */
@Controller()
export class UsersServiceController {
  constructor(private handler: UsersServiceHandler) {}

  // ============================================
  // User CRUD
  // ============================================

  @MessagePattern(USERS_PATTERNS.CREATE_USER)
  async createUser(@Payload() dto: any) {
    return this.handler.createUser(dto);
  }

  @MessagePattern(USERS_PATTERNS.GET_USER)
  async getUser(@Payload() dto: any) {
    return this.handler.getUser(dto);
  }

  @MessagePattern(USERS_PATTERNS.GET_USER_BY_PHONE)
  async getUserByPhone(@Payload() dto: { phoneNumber: string }) {
    return this.handler.getUserByPhone(dto);
  }

  @MessagePattern('users.get.by.id')
  async getUserById(@Payload() dto: { userId: string }) {
    return this.handler.getUserById(dto);
  }

  @MessagePattern('users.get.bulk')
  async getUsersByIds(@Payload() dto: { userIds: string[] }) {
    return this.handler.getUsersByIds(dto);
  }

  @MessagePattern(USERS_PATTERNS.UPDATE_USER)
  async updateUser(@Payload() dto: any) {
    return this.handler.updateUser(dto);
  }

  @MessagePattern(USERS_PATTERNS.DELETE_USER)
  async deleteUser(@Payload() dto: { userId: string }) {
    return this.handler.deleteUser(dto);
  }

  // ============================================
  // Search
  // ============================================

  @MessagePattern(USERS_PATTERNS.SEARCH_USERS)
  async searchUsers(@Payload() dto: any) {
    return this.handler.searchUsers(dto);
  }

  // ============================================
  // Presence & Status
  // ============================================

  @MessagePattern(USERS_PATTERNS.UPDATE_STATUS)
  async updateStatus(@Payload() dto: { userId: string; status: string }) {
    return this.handler.updateStatus(dto);
  }

  @MessagePattern(USERS_PATTERNS.GET_PRESENCE)
  async getPresence(@Payload() dto: { userId: string }) {
    return this.handler.getPresence(dto);
  }

  @MessagePattern('users.presence.bulk')
  async getPresenceBulk(@Payload() dto: { userIds: string[] }) {
    return this.handler.getPresenceBulk(dto);
  }

  // ============================================
  // Settings
  // ============================================

  @MessagePattern(USERS_PATTERNS.GET_SETTINGS)
  async getSettings(@Payload() dto: { userId: string }) {
    return this.handler.getSettings(dto);
  }

  @MessagePattern(USERS_PATTERNS.UPDATE_SETTINGS)
  async updateSettings(@Payload() dto: { userId: string; settings: any }) {
    return this.handler.updateSettings(dto);
  }

  // ============================================
  // Blocking
  // ============================================

  @MessagePattern(USERS_PATTERNS.BLOCK_USER)
  async blockUser(@Payload() dto: { userId: string; blockedUserId: string }) {
    return this.handler.blockUser(dto);
  }

  @MessagePattern(USERS_PATTERNS.UNBLOCK_USER)
  async unblockUser(@Payload() dto: { userId: string; blockedUserId: string }) {
    return this.handler.unblockUser(dto);
  }

  @MessagePattern(USERS_PATTERNS.GET_BLOCKED_USERS)
  async getBlockedUsers(@Payload() dto: { userId: string }) {
    return this.handler.getBlockedUsers(dto);
  }

  @MessagePattern('users.is.blocked')
  async isBlocked(@Payload() dto: { userId: string; targetUserId: string }) {
    return this.handler.isBlocked(dto);
  }

  // ============================================
  // Contacts
  // ============================================

  @MessagePattern(USERS_PATTERNS.SYNC_CONTACTS)
  async syncContacts(@Payload() dto: any) {
    return this.handler.syncContacts(dto);
  }

  @MessagePattern(USERS_PATTERNS.GET_CONTACTS)
  async getContacts(@Payload() dto: { userId: string }) {
    return this.handler.getContacts(dto);
  }

  // ============================================
  // Verification
  // ============================================

  @MessagePattern(USERS_PATTERNS.VERIFY_USER)
  async verifyUser(@Payload() dto: { userId: string }) {
    return this.handler.verifyUser(dto);
  }

  // ============================================
  // FCM Token Management
  // ============================================

  @MessagePattern(USERS_PATTERNS.ADD_FCM_TOKEN)
  async addFcmToken(@Payload() dto: { userId: string; token: string }) {
    return this.handler.addFcmToken(dto);
  }

  @MessagePattern(USERS_PATTERNS.REMOVE_FCM_TOKEN)
  async removeFcmToken(@Payload() dto: { userId: string; token: string }) {
    return this.handler.removeFcmToken(dto);
  }

  @MessagePattern('users.fcm.tokens.get')
  async getFcmTokens(@Payload() dto: { userId: string }) {
    return this.handler.getFcmTokens(dto);
  }

  // ============================================
  // Device Linking
  // ============================================

  @MessagePattern(USERS_PATTERNS.LINK_DEVICE)
  async linkDevice(@Payload() dto: any) {
    return this.handler.linkDevice(dto);
  }

  @MessagePattern(USERS_PATTERNS.UNLINK_DEVICE)
  async unlinkDevice(@Payload() dto: { userId: string; deviceId: string }) {
    return this.handler.unlinkDevice(dto);
  }

  @MessagePattern(USERS_PATTERNS.GET_LINKED_DEVICES)
  async getLinkedDevices(@Payload() dto: { userId: string }) {
    return this.handler.getLinkedDevices(dto);
  }
}
