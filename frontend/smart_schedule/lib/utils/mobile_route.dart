import 'package:flutter/cupertino.dart';



PageRoute<T> createMobileRoute<T>({
  required WidgetBuilder builder,
  bool fullscreenDialog = false,
}) {
  return _NoSwipePageRoute<T>(
    builder: builder,
    fullscreenDialog: fullscreenDialog,
  );
}

class _NoSwipePageRoute<T> extends CupertinoPageRoute<T> {
  _NoSwipePageRoute({required super.builder, super.fullscreenDialog});

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    
    return child;
  }

  @override
  bool canTransitionTo(TransitionRoute<dynamic> nextRoute) => false;

  @override
  bool canTransitionFrom(TransitionRoute<dynamic> previousRoute) => false;
}
