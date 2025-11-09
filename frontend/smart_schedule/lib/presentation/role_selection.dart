import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/student/field_select_screen.dart';
import 'package:smart_schedule/presentation/teacher/teacher_select_screen.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/utils/web_route.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final Widget content = CupertinoPageScaffold(
      navigationBar: null,
      child: SafeArea(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            final double maxWidth = constraints.maxWidth;
            final bool isWideScreen = maxWidth > 700;

            return Container(
              color: CupertinoColors.systemGroupedBackground,
              child: Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: isWideScreen ? 600 : maxWidth,
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        // Logo/Icon
                        const Icon(
                          CupertinoIcons.calendar_today,
                          size: 80,
                          color: CupertinoColors.systemBlue,
                        ),
                        const SizedBox(height: 24),

                        // Title
                        const Text(
                          'Smart Schedule',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: CupertinoColors.black,
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Subtitle
                        Text(
                          'Manage your academic schedule efficiently',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 16,
                            color: CupertinoColors.systemGrey.darkColor,
                          ),
                        ),
                        const SizedBox(height: 48),

                        // Teacher Card
                        _RoleCard(
                          icon: CupertinoIcons.person_3_fill,
                          title: 'Teacher',
                          description: 'View and manage your teaching schedule',
                          color: CupertinoColors.systemBlue,
                          onTap: () async {
                            provider.setIsTeacher(true);
                            // ignore: use_build_context_synchronously
                            Navigator.of(context).push(
                              createWebAwareRoute<void>(
                                builder: (_) => const TeacherSelectScreen(),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 16),

                        // Student Card
                        _RoleCard(
                          icon: CupertinoIcons.book_fill,
                          title: 'Student',
                          description:
                              'Access your class schedule and optional courses',
                          color: CupertinoColors.systemGreen,
                          onTap: () async {
                            provider.setIsTeacher(false);
                            // ignore: use_build_context_synchronously
                            Navigator.of(context).push(
                              createWebAwareRoute<void>(
                                builder: (_) => const FieldSelectScreen(),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );

    if (!PlatformService.isWeb) {
      return PopScope(canPop: false, child: content);
    }
    return content;
  }
}

class _RoleCard extends StatefulWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final VoidCallback onTap;

  const _RoleCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
    required this.onTap,
  });

  @override
  State<_RoleCard> createState() => _RoleCardState();
}

class _RoleCardState extends State<_RoleCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        transform: Matrix4.identity()..scale(_isPressed ? 0.98 : 1.0),
        decoration: BoxDecoration(
          color: CupertinoColors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: widget.color.withOpacity(_isPressed ? 0.3 : 0.15),
              blurRadius: _isPressed ? 15 : 20,
              offset: Offset(0, _isPressed ? 4 : 8),
            ),
          ],
          border: Border.all(color: widget.color.withOpacity(0.2), width: 2),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Row(
            children: [
              // Icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: widget.color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(widget.icon, size: 36, color: widget.color),
              ),
              const SizedBox(width: 20),

              // Text content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.title,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: CupertinoColors.black,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.description,
                      style: TextStyle(
                        fontSize: 14,
                        color: CupertinoColors.systemGrey.darkColor,
                      ),
                    ),
                  ],
                ),
              ),

              // Arrow
              Icon(CupertinoIcons.chevron_right, color: widget.color, size: 24),
            ],
          ),
        ),
      ),
    );
  }
}
