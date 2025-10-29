import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/student/field_select_screen.dart';
import 'package:smart_schedule/presentation/teacher/teacher_select_screen.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final DataProvider provider = AppScope.of(context);
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(middle: Text('Choose Role')),
      child: SafeArea(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            final double maxWidth = constraints.maxWidth;
            final double cardWidth = maxWidth > 600 ? 400 : maxWidth - 32;
            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints.tightFor(width: cardWidth),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      CupertinoButton.filled(
                        onPressed: () async {
                          provider.setIsTeacher(true);
                          // Navigate to teacher selection
                          // ignore: use_build_context_synchronously
                          Navigator.of(context).push(
                            CupertinoPageRoute<void>(
                              builder: (_) => const TeacherSelectScreen(),
                            ),
                          );
                        },
                        child: const Text('I am a Teacher'),
                      ),
                      const SizedBox(height: 12),
                      CupertinoButton(
                        onPressed: () async {
                          provider.setIsTeacher(false);
                          // Navigate to field selection
                          // ignore: use_build_context_synchronously
                          Navigator.of(context).push(
                            CupertinoPageRoute<void>(
                              builder: (_) => const FieldSelectScreen(),
                            ),
                          );
                        },
                        child: const Text('I am a Student'),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
