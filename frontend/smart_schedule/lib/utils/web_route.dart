import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' as material;
import 'package:flutter/foundation.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/utils/no_swipe_route.dart';

/// Creates a route that properly integrates with browser history on web
/// Uses MaterialPageRoute on web (which has better browser history support)
/// and a custom route on mobile that disables swipe-to-go-back
PageRoute<T> createWebAwareRoute<T>({
  required WidgetBuilder builder,
  bool fullscreenDialog = false,
}) {
  if (kIsWeb && PlatformService.isWeb) {
    // On web, use MaterialPageRoute which properly integrates with browser history
    // The UI still uses Cupertino widgets, so the styling is preserved
    return material.MaterialPageRoute<T>(
      builder: builder,
      fullscreenDialog: fullscreenDialog,
    );
  } else {
    // On mobile, use NoSwipePageRoute to completely disable swipe gestures
    return NoSwipePageRoute<T>(
      builder: builder,
      fullscreenDialog: fullscreenDialog,
    );
  }
}
