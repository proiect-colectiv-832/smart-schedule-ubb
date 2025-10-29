import 'package:flutter/widgets.dart';
import 'package:smart_schedule/data/data_provider.dart';

class AppScope extends InheritedNotifier<DataProvider> {
  const AppScope({
    super.key,
    required DataProvider notifier,
    required Widget child,
  }) : super(notifier: notifier, child: child);

  static DataProvider of(BuildContext context) {
    final AppScope? scope = context
        .dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope not found in context');
    return scope!.notifier!;
  }
}
