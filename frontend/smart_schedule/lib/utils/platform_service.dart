import 'package:flutter/foundation.dart';

import 'dart:html' as html; 

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

  static bool get isMobileBrowser {
    if (!kIsWeb) return false;
    
    try {
      final ua = html.window.navigator.userAgent.toLowerCase();
      final isMobileDevice =
          ua.contains('iphone') ||
          ua.contains('ipad') ||
          ua.contains('ipod') ||
          ua.contains('android');
      return isMobileDevice && !isStandalonePwa;
    } catch (_) {
      return false;
    }
  }

  static bool get isIOS {
    if (!kIsWeb) return false;
    try {
      final ua = html.window.navigator.userAgent.toLowerCase();
      return ua.contains('iphone') ||
          ua.contains('ipad') ||
          ua.contains('ipod');
    } catch (_) {
      return false;
    }
  }

  static bool get isAndroid {
    if (!kIsWeb) return false;
    try {
      final ua = html.window.navigator.userAgent.toLowerCase();
      return ua.contains('android');
    } catch (_) {
      return false;
    }
  }
}
