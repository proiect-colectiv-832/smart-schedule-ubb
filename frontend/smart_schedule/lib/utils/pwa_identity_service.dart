
import 'dart:html' as html;

import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import 'platform_service.dart';

class PwaIdentityService {
  static const String _storageKey = 'smart_schedule_pwa_user_id';
  static final Uuid _uuid = const Uuid();
  static String? _cachedUserId;

  static Future<String?> ensureUserId() async {
    if (!kIsWeb || !PlatformService.isStandalonePwa) {
      return null;
    }

    if (_cachedUserId != null && _cachedUserId!.isNotEmpty) {
      return _cachedUserId;
    }

    try {
      final String? existing = html.window.localStorage[_storageKey];
      if (existing != null && existing.isNotEmpty) {
        _cachedUserId = existing;
        return existing;
      }
      final String generated = _uuid.v4();
      html.window.localStorage[_storageKey] = generated;
      _cachedUserId = generated;
      return generated;
    } catch (_) {
      return null;
    }
  }
}
