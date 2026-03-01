import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' as material;
import 'package:flutter/foundation.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/utils/no_swipe_route.dart';




PageRoute<T> createWebAwareRoute<T>({
  required WidgetBuilder builder,
  bool fullscreenDialog = false,
}) {
  if (kIsWeb && PlatformService.isWeb && !PlatformService.isMobileBrowser) {
    
    
    return material.MaterialPageRoute<T>(
      builder: builder,
      fullscreenDialog: fullscreenDialog,
    );
  } else {
    
    return NoSwipePageRoute<T>(
      builder: builder,
      fullscreenDialog: fullscreenDialog,
    );
  }
}
