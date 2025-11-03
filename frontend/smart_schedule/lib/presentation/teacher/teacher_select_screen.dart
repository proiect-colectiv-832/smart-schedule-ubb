import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/teacher/teacher_timetable_screen.dart';

class TeacherSelectScreen extends StatefulWidget {
  const TeacherSelectScreen({super.key});

  @override
  State<TeacherSelectScreen> createState() => _TeacherSelectScreenState();
}

class _TeacherSelectScreenState extends State<TeacherSelectScreen> {
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    // Defer provider lookup to after first frame so InheritedNotifier is available
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final BaseProvider provider = AppScope.of(context);
      provider.loadTeachers();
    });
  }

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final teachers = provider.teachers;

    // Filter teachers based on search query
    final filteredTeachers = _searchQuery.isEmpty
        ? teachers
        : teachers
              .where(
                (t) =>
                    t.name.toLowerCase().contains(_searchQuery.toLowerCase()),
              )
              .toList();

    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Select Teacher'),
      ),
      child: SafeArea(
        child: provider.isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : Column(
                children: [
                  // Search bar
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: CupertinoSearchTextField(
                      placeholder: 'Search teachers...',
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value;
                        });
                      },
                      style: const TextStyle(fontSize: 16),
                    ),
                  ),
                  // Results count
                  if (_searchQuery.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${filteredTeachers.length} ${filteredTeachers.length == 1 ? 'teacher' : 'teachers'} found',
                          style: TextStyle(
                            fontSize: 14,
                            color: CupertinoColors.systemGrey.darkColor,
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  // Teachers list
                  Expanded(
                    child: filteredTeachers.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // Avoid icons on web list when not personalized
                                const SizedBox(height: 16),
                                Text(
                                  _searchQuery.isEmpty
                                      ? 'No teachers available'
                                      : 'No teachers found',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: CupertinoColors.systemGrey.darkColor,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            itemBuilder: (BuildContext context, int index) {
                              final TeacherName teacher =
                                  filteredTeachers[index];
                              return _TeacherCard(
                                teacher: teacher,
                                onTap: () async {
                                  final NavigatorState navigator = Navigator.of(
                                    context,
                                  );
                                  await provider.selectTeacherAndLoadTimeTable(
                                    teacher,
                                  );
                                  if (!mounted) return;
                                  navigator.push(
                                    CupertinoPageRoute<void>(
                                      builder: (_) =>
                                          const TeacherTimeTableScreen(),
                                    ),
                                  );
                                },
                              );
                            },
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemCount: filteredTeachers.length,
                          ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _TeacherCard extends StatelessWidget {
  final TeacherName teacher;
  final VoidCallback onTap;

  const _TeacherCard({required this.teacher, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: CupertinoColors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: CupertinoColors.systemGrey.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: CupertinoColors.systemBlue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Center(
                child: Text(
                  _getInitials(teacher.name),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: CupertinoColors.systemBlue,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            // Teacher name
            Expanded(
              child: Text(
                teacher.name,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: CupertinoColors.black,
                ),
              ),
            ),
            // Arrow
            const Icon(
              CupertinoIcons.chevron_right,
              size: 20,
              color: CupertinoColors.systemGrey3,
            ),
          ],
        ),
      ),
    );
  }

  String _getInitials(String name) {
    final parts = name.split(' ');
    if (parts.isEmpty) return '';
    if (parts.length == 1) return parts[0].substring(0, 1).toUpperCase();
    return '${parts[0].substring(0, 1)}${parts[1].substring(0, 1)}'
        .toUpperCase();
  }
}
