import 'package:flutter/widgets.dart';
import 'package:smart_schedule/data/base_provider.dart';

class AppScope extends InheritedNotifier<BaseProvider> {
  const AppScope({
    super.key,
    required BaseProvider notifier,
    required Widget child,
  }) : super(notifier: notifier, child: child);

  static BaseProvider of(BuildContext context) {
    final AppScope? scope = context
        .dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found in context');
    return scope!.notifier!;
  }
}
