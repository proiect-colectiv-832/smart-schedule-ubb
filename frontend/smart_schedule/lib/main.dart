import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/api_handler.dart';
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/role_selection.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final DataProvider provider = DataProvider(api: const ApiHandler());
    return CupertinoApp(
      title: 'Smart Schedule PWA',
      debugShowCheckedModeBanner: false,
      home: const RoleSelectionScreen(),
      builder: (BuildContext context, Widget? child) {
        return AppScope(
          notifier: provider,
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
