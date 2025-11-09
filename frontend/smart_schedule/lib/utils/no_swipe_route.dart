import 'package:flutter/material.dart';

class NoSwipePageRoute<T> extends MaterialPageRoute<T> {
  NoSwipePageRoute({
    required super.builder,
    super.settings,
    super.maintainState = true,
    super.fullscreenDialog = false,
  });

  @override
  Widget buildTransitions(
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // No swipe gesture - just fade transition
    return FadeTransition(
      opacity: animation,
      child: WillPopScope(
        onWillPop: () async => false,
        child: PopScope(canPop: false, child: child),
      ),
    );
  }

  @override
  bool canTransitionTo(TransitionRoute<dynamic> nextRoute) => false;

  @override
  bool canTransitionFrom(TransitionRoute<dynamic> previousRoute) => false;
}
