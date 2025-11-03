import 'package:flutter/foundation.dart';
// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html; // safe guarded by kIsWeb

class PlatformService {
  static bool get isWeb => kIsWeb;

  static bool get isStandalonePwa {
    if (!kIsWeb) return false;
    try {
      return html.window.matchMedia('(display-mode: standalone)').matches;
    } catch (_) {
      return false;
    }
  }

  static bool get isMobilePwa {
    if (!kIsWeb) return false;
    if (!isStandalonePwa) return false;
    try {
      final ua = html.window.navigator.userAgent.toLowerCase();
      return ua.contains('iphone') ||
          ua.contains('ipad') ||
          ua.contains('ipod') ||
          ua.contains('android');
    } catch (_) {
      return false;
    }
  }
}
