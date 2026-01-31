import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/storage_keys.dart';

class SecureStorage {
  static SecureStorage? _instance;
  late FlutterSecureStorage _storage;

  SecureStorage._() {
    _storage = FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
        resetOnError: true,
      ),
      iOptions: const IOSOptions(
        accessibility: KeychainAccessibility.first_unlock_this_device,
      ),
    );
  }

  static SecureStorage get instance {
    _instance ??= SecureStorage._();
    return _instance!;
  }

  // Token management
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: StorageKeys.accessToken, value: accessToken),
      _storage.write(key: StorageKeys.refreshToken, value: refreshToken),
    ]);
  }

  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: StorageKeys.accessToken);
    } catch (e) {
      return null;
    }
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: StorageKeys.refreshToken);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: StorageKeys.accessToken),
      _storage.delete(key: StorageKeys.refreshToken),
    ]);
  }

  Future<bool> hasTokens() async {
    try {
      final accessToken = await getAccessToken().timeout(
        const Duration(seconds: 5),
        onTimeout: () => null,
      );
      final refreshToken = await getRefreshToken().timeout(
        const Duration(seconds: 5),
        onTimeout: () => null,
      );
      return accessToken != null && refreshToken != null;
    } catch (e) {
      // If storage fails, assume no tokens
      return false;
    }
  }

  // Phone verification data
  Future<void> saveVerificationData({
    required String verificationId,
    required String phoneNumber,
  }) async {
    await Future.wait([
      _storage.write(key: StorageKeys.verificationId, value: verificationId),
      _storage.write(key: StorageKeys.phoneNumber, value: phoneNumber),
    ]);
  }

  Future<String?> getVerificationId() async {
    try {
      return await _storage.read(key: StorageKeys.verificationId);
    } catch (e) {
      return null;
    }
  }

  Future<String?> getPhoneNumber() async {
    try {
      return await _storage.read(key: StorageKeys.phoneNumber);
    } catch (e) {
      return null;
    }
  }

  Future<void> clearVerificationData() async {
    await Future.wait([
      _storage.delete(key: StorageKeys.verificationId),
      _storage.delete(key: StorageKeys.phoneNumber),
    ]);
  }

  // User info
  Future<void> saveUserInfo({
    required String id,
    required String phoneNumber,
  }) async {
    await Future.wait([
      _storage.write(key: StorageKeys.userId, value: id),
      _storage.write(key: StorageKeys.userPhone, value: phoneNumber),
    ]);
  }

  Future<String?> getUserId() async {
    return await _storage.read(key: StorageKeys.userId);
  }

  Future<String?> getUserPhone() async {
    return await _storage.read(key: StorageKeys.userPhone);
  }

  Future<void> clearUserInfo() async {
    await Future.wait([
      _storage.delete(key: StorageKeys.userId),
      _storage.delete(key: StorageKeys.userPhone),
    ]);
  }

  // Clear all
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
