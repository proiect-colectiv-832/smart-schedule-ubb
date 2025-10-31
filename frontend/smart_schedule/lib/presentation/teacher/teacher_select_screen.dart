import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/teacher/teacher_timetable_screen.dart';

class TeacherSelectScreen extends StatefulWidget {
  const TeacherSelectScreen({super.key});

  @override
  State<TeacherSelectScreen> createState() => _TeacherSelectScreenState();
}

class _TeacherSelectScreenState extends State<TeacherSelectScreen> {
  @override
  void initState() {
    super.initState();
    // Defer provider lookup to after first frame so InheritedNotifier is available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final DataProvider provider = AppScope.of(context);
      provider.loadTeachers();
    });
  }

  @override
  Widget build(BuildContext context) {
    final DataProvider provider = AppScope.of(context);
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Select Teacher'),
      ),
      child: SafeArea(
        child: provider.isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : ListView.separated(
                padding: const EdgeInsets.all(12),
                itemBuilder: (BuildContext context, int index) {
                  final TeacherName t = provider.teachers[index];
                  return _CupertinoListItem(
                    title: t.name,
                    onTap: () async {
                      final NavigatorState navigator = Navigator.of(context);
                      await provider.selectTeacherAndLoadTimeTable(t);
                      if (!mounted) return;
                      navigator.push(
                        CupertinoPageRoute<void>(
                          builder: (_) => const TeacherTimeTableScreen(),
                        ),
                      );
                    },
                  );
                },
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemCount: provider.teachers.length,
              ),
      ),
    );
  }
}

class _CupertinoListItem extends StatelessWidget {
  final String title;
  final VoidCallback onTap;

  const _CupertinoListItem({required this.title, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return CupertinoButton(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      color: CupertinoColors.systemGrey6,
      borderRadius: BorderRadius.circular(12),
      onPressed: onTap,
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(title, style: const TextStyle(fontSize: 16)),
      ),
    );
  }
}
