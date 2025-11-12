import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:overlay_support/overlay_support.dart';
import 'package:smart_schedule/data/api_handler.dart';
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/role_selection.dart';
import 'package:smart_schedule/presentation/my/my_timetable_screen.dart';
import 'package:smart_schedule/presentation/custom_tab_scaffold.dart';
import 'package:smart_schedule/utils/web_route.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = PlatformService.isMobilePwa
        ? MobileDataProvider(api: const ApiHandler())
        : WebDataProvider(api: const ApiHandler());
    if (provider is MobileDataProvider) {
      // Restore personalized timetable if any
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        await provider.restorePersonalizedIfAny();
      });
      return OverlaySupport.global(
        child: MaterialApp(
          title: 'Smart Schedule PWA',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            cupertinoOverrideTheme: const CupertinoThemeData(),
            textTheme: const TextTheme(
              bodyLarge: TextStyle(decoration: TextDecoration.none),
              bodyMedium: TextStyle(decoration: TextDecoration.none),
              bodySmall: TextStyle(decoration: TextDecoration.none),
              displayLarge: TextStyle(decoration: TextDecoration.none),
              displayMedium: TextStyle(decoration: TextDecoration.none),
              displaySmall: TextStyle(decoration: TextDecoration.none),
              headlineLarge: TextStyle(decoration: TextDecoration.none),
              headlineMedium: TextStyle(decoration: TextDecoration.none),
              headlineSmall: TextStyle(decoration: TextDecoration.none),
              titleLarge: TextStyle(decoration: TextDecoration.none),
              titleMedium: TextStyle(decoration: TextDecoration.none),
              titleSmall: TextStyle(decoration: TextDecoration.none),
              labelLarge: TextStyle(decoration: TextDecoration.none),
              labelMedium: TextStyle(decoration: TextDecoration.none),
              labelSmall: TextStyle(decoration: TextDecoration.none),
            ),
            pageTransitionsTheme: const PageTransitionsTheme(
              builders: {
                TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
                TargetPlatform.iOS: FadeUpwardsPageTransitionsBuilder(),
              },
            ),
          ),
          builder: (BuildContext context, Widget? child) {
            return DefaultTextStyle(
              style: const TextStyle(
                decoration: TextDecoration.none,
                color: CupertinoColors.black,
              ),
              child: AppScope(
                notifier: provider,
                child: child ?? const SizedBox.shrink(),
              ),
            );
          },
          home: CustomTabScaffold(
            items: const <BottomNavigationBarItem>[
              BottomNavigationBarItem(
                icon: Icon(CupertinoIcons.search),
                label: 'Browse',
              ),
              BottomNavigationBarItem(
                icon: Icon(CupertinoIcons.person_crop_square),
                label: 'My Timetable',
              ),
            ],
            tabBuilder: (BuildContext context, int index) {
              switch (index) {
                case 0:
                  return const RoleSelectionScreen();
                case 1:
                default:
                  return const MyTimetableScreen();
              }
            },
          ),
        ),
      );
    } else {
      // On web, use initialRoute to ensure proper browser back button support
      if (kIsWeb && PlatformService.isWeb) {
        return OverlaySupport.global(
          child: CupertinoApp(
            title: 'Smart Schedule PWA',
            debugShowCheckedModeBanner: false,
            builder: (BuildContext context, Widget? child) {
              return AppScope(
                notifier: provider,
                child: child ?? const SizedBox.shrink(),
              );
            },
            initialRoute: '/',
            onGenerateRoute: (settings) {
              if (settings.name == '/' || settings.name == null) {
                return createWebAwareRoute<void>(
                  builder: (_) => const RoleSelectionScreen(),
                );
              }
              return null;
            },
          ),
        );
      } else {
        return OverlaySupport.global(
          child: CupertinoApp(
            title: 'Smart Schedule PWA',
            debugShowCheckedModeBanner: false,
            builder: (BuildContext context, Widget? child) {
              return AppScope(
                notifier: provider,
                child: child ?? const SizedBox.shrink(),
              );
            },
            home: const RoleSelectionScreen(),
          ),
        );
      }
    }
  }
}
