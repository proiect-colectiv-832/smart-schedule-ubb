import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart';
import 'dart:html' as html;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const CupertinoApp(
      title: 'Smart Schedule PWA',
      home: MyHomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  String platformText = 'Detecting platform...';

  @override
  void initState() {
    super.initState();
    _detectPlatform();
  }

  Future<void> _detectPlatform() async {
    if (kIsWeb) {
      final platform = await PlatformService.detectPlatform();
      setState(() {
        platformText = platform;
      });
    } else {
      setState(() {
        platformText = 'Not running on web';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Smart Schedule PWA'),
      ),
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Text(
            platformText,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w500),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}

class PlatformService {
  static Future<String> detectPlatform() async {
    if (!kIsWeb) {
      return 'Not running on web';
    }

    try {
      // Check if running as PWA using display-mode media query
      final isStandalone = html.window
          .matchMedia('(display-mode: standalone)')
          .matches;

      if (isStandalone) {
        // For PWA detection, check user agent to determine platform
        final userAgent = html.window.navigator.userAgent.toLowerCase();

        if (userAgent.contains('iphone') ||
            userAgent.contains('ipad') ||
            userAgent.contains('ipod')) {
          return 'You are on iOS';
        } else if (userAgent.contains('android')) {
          return 'You are on Android';
        } else {
          // Fallback for other standalone modes
          return 'You are on PWA (Unknown Platform)';
        }
      } else {
        return 'You are on Web';
      }
    } catch (e) {
      // Fallback if detection fails
      return 'You are on Web (Detection Failed)';
    }
  }
}
