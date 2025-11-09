import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/utils/platform_service.dart';

class SubjectsScreen extends StatefulWidget {
  const SubjectsScreen({super.key});

  @override
  State<SubjectsScreen> createState() => _SubjectsScreenState();
}

class _SubjectsScreenState extends State<SubjectsScreen> {
  List<Subject> _allSubjects = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAllSubjects();
  }

  Future<void> _loadAllSubjects() async {
    final BaseProvider provider = AppScope.of(context);

    try {
      _allSubjects = await provider.api.fetchSubjects();
      _allSubjects.sort((a, b) => a.name.compareTo(b.name));
    } catch (e) {
      _allSubjects = [];
    }

    setState(() {
      _isLoading = false;
    });
  }

  void _showSubjectPreview(Subject subject) {
    showCupertinoDialog(
      context: context,
      builder: (BuildContext context) =>
          _SubjectPreviewDialog(subject: subject),
    );
  }

  @override
  Widget build(BuildContext context) {
    final Widget content = CupertinoPageScaffold(
      backgroundColor: CupertinoColors.white,
      navigationBar: null,
      child: SafeArea(
        child: _isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : Column(
                children: [
                  // Header with title and back button
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
                        const SizedBox(width: 12),
                        const Text(
                          'Add Subjects',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: CupertinoColors.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Subjects grid
                  Expanded(
                    child: _allSubjects.isEmpty
                        ? Center(
                            child: Text(
                              'No subjects available',
                              style: TextStyle(
                                fontSize: 16,
                                color: CupertinoColors.systemGrey.darkColor,
                              ),
                            ),
                          )
                        : LayoutBuilder(
                            builder: (context, constraints) {
                              final double width = constraints.maxWidth;
                              int crossAxisCount = (width / 180).floor();
                              if (crossAxisCount < 2) crossAxisCount = 2;

                              return GridView.builder(
                                padding: const EdgeInsets.all(16),
                                gridDelegate:
                                    SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: crossAxisCount,
                                      crossAxisSpacing: 12,
                                      mainAxisSpacing: 12,
                                      childAspectRatio: 2.5,
                                    ),
                                itemCount: _allSubjects.length,
                                itemBuilder: (context, index) {
                                  final Subject subject = _allSubjects[index];
                                  return _SubjectTile(
                                    subject: subject,
                                    onTap: () => _showSubjectPreview(subject),
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

class _SubjectTile extends StatelessWidget {
  final Subject subject;
  final VoidCallback onTap;

  const _SubjectTile({required this.subject, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: CupertinoColors.systemGrey6,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: CupertinoColors.systemGrey4, width: 1),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              subject.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: CupertinoColors.black,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${subject.entries.length} ${subject.entries.length == 1 ? 'class' : 'classes'}',
              style: TextStyle(
                fontSize: 12,
                color: CupertinoColors.systemGrey.darkColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SubjectPreviewDialog extends StatelessWidget {
  final Subject subject;

  const _SubjectPreviewDialog({required this.subject});

  String _formatTimeOfDay(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  String _formatDay(Day day) {
    switch (day) {
      case Day.monday:
        return 'Mon';
      case Day.tuesday:
        return 'Tue';
      case Day.wednesday:
        return 'Wed';
      case Day.thursday:
        return 'Thu';
      case Day.friday:
        return 'Fri';
      case Day.saturday:
        return 'Sat';
      case Day.sunday:
        return 'Sun';
    }
  }

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);

    return CupertinoAlertDialog(
      title: Text('Add ${subject.name}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          Text(
            'This will add ${subject.entries.length} ${subject.entries.length == 1 ? 'class' : 'classes'} to your timetable.',
            style: const TextStyle(fontSize: 14),
          ),
          const SizedBox(height: 16),
          const Text(
            'Classes to be added:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 200,
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: subject.entries.length > 10
                  ? 10
                  : subject.entries.length,
              separatorBuilder: (_, __) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final entry = subject.entries[index];
                return Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: CupertinoColors.systemGrey6,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_formatDay(entry.day)} • ${_formatTimeOfDay(entry.interval.start)} - ${_formatTimeOfDay(entry.interval.end)}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: CupertinoColors.black,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${entry.room} • ${entry.teacher.name}',
                        style: TextStyle(
                          fontSize: 11,
                          color: CupertinoColors.systemGrey.darkColor,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          if (subject.entries.length > 10)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                '... and ${subject.entries.length - 10} more',
                style: TextStyle(
                  fontSize: 12,
                  color: CupertinoColors.systemGrey.darkColor,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
        ],
      ),
      actions: <CupertinoDialogAction>[
        CupertinoDialogAction(
          isDefaultAction: false,
          onPressed: () {
            Navigator.of(context).pop();
          },
          child: const Text('Cancel'),
        ),
        CupertinoDialogAction(
          isDefaultAction: true,
          onPressed: () {
            provider.addSubject(subject);
            Navigator.of(context).pop();
          },
          child: const Text('Add'),
        ),
      ],
    );
  }
}
