import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/teacher/teacher_timetable_screen.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/utils/web_route.dart';

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

    final Widget content = CupertinoPageScaffold(
      backgroundColor: CupertinoColors.white,
      navigationBar: null,
      child: SafeArea(
        child: provider.isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : Column(
                children: [
                  // Search bar with back button
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        CupertinoButton(
                          padding: EdgeInsets.zero,
                          minSize: 0,
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Icon(
                            CupertinoIcons.back,
                            size: 28,
                            color: CupertinoColors.systemBlue,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: CupertinoSearchTextField(
                            prefixIcon: const Icon(
                              CupertinoIcons.search,
                              color: CupertinoColors.systemGrey,
                            ),
                            placeholder: 'Search teachers...',
                            onChanged: (value) {
                              setState(() {
                                _searchQuery = value;
                              });
                            },
                            style: const TextStyle(fontSize: 16),
                          ),
                        ),
                      ],
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
                  // Teachers grid
                  Expanded(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        if (filteredTeachers.isEmpty) {
                          return Center(
                            child: Text(
                              _searchQuery.isEmpty
                                  ? 'No teachers available'
                                  : 'No teachers found',
                              style: TextStyle(
                                fontSize: 16,
                                color: CupertinoColors.systemGrey.darkColor,
                              ),
                            ),
                          );
                        }

                        final double width = constraints.maxWidth;
                        int crossAxisCount = (width / 200).floor();
                        if (crossAxisCount < 2) crossAxisCount = 2;

                        return GridView.builder(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 5,
                          ),
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: crossAxisCount,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 3.2,
                              ),
                          itemCount: filteredTeachers.length,
                          itemBuilder: (context, index) {
                            final TeacherName teacher = filteredTeachers[index];
                            return _TeacherTile(
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
                                  createWebAwareRoute<void>(
                                    builder: (_) =>
                                        const TeacherTimeTableScreen(),
                                  ),
                                );
                              },
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
      ),
    );

    if (!PlatformService.isWeb) {
      return PopScope(canPop: false, child: content);
    }
    return content;
  }
}

class _TeacherTile extends StatelessWidget {
  final TeacherName teacher;
  final VoidCallback onTap;

  const _TeacherTile({required this.teacher, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: CupertinoColors.systemGrey6,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: CupertinoColors.systemGrey4, width: 1),
        ),
        child: Center(
          child: Text(
            teacher.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: CupertinoColors.black,
            ),
          ),
        ),
      ),
    );
  }
}
