import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay; // for formatting times
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';

class StudentTimeTableScreen extends StatelessWidget {
  const StudentTimeTableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final DataProvider provider = AppScope.of(context);
    final List<TimeTableEntry> entries =
        provider.currentTimeTable?.entries ?? <TimeTableEntry>[];
    final subjects = provider.subjects;
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Student Timetable'),
      ),
      child: SafeArea(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            final bool twoColumns = constraints.maxWidth >= 900;
            return Padding(
              padding: const EdgeInsets.all(12.0),
              child: twoColumns
                  ? Row(
                      children: <Widget>[
                        Expanded(
                          child: _EntriesList(
                            entries: entries,
                            provider: provider,
                          ),
                        ),
                        const SizedBox(width: 12),
                        SizedBox(
                          width: 320,
                          child: _SubjectsPane(subjects: subjects),
                        ),
                      ],
                    )
                  : Column(
                      children: <Widget>[
                        Expanded(
                          child: _EntriesList(
                            entries: entries,
                            provider: provider,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _SubjectsPane(subjects: subjects),
                      ],
                    ),
            );
          },
        ),
      ),
    );
  }
}

class _EntriesList extends StatelessWidget {
  final List<TimeTableEntry> entries;
  final DataProvider provider;

  const _EntriesList({required this.entries, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        Expanded(
          child: ListView.separated(
            itemBuilder: (BuildContext context, int index) {
              final TimeTableEntry e = entries[index];
              String _formatTimeOfDay(TimeOfDay t) =>
                  '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
              final String time =
                  '${_formatTimeOfDay(e.interval.start)} - ${_formatTimeOfDay(e.interval.end)}';
              return Container(
                decoration: BoxDecoration(
                  color: CupertinoColors.systemGrey6,
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text(
                            e.subjectName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${e.day.name.toUpperCase()} • $time • ${e.room}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: CupertinoColors.inactiveGray,
                            ),
                          ),
                        ],
                      ),
                    ),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      onPressed: () => provider.removeEntry(e.id),
                      child: const Icon(CupertinoIcons.delete, size: 20),
                    ),
                  ],
                ),
              );
            },
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemCount: entries.length,
          ),
        ),
        const SizedBox(height: 8),
        CupertinoButton(
          onPressed: () {
            final TimeTableEntry newEntry = TimeTableEntry(
              id: DateTime.now().millisecondsSinceEpoch,
              day: Day.monday,
              interval: TimeInterval(
                start: const TimeOfDay(hour: 9, minute: 0),
                end: const TimeOfDay(hour: 10, minute: 30),
              ),
              subjectName: 'New Subject',
              teacher: provider.selectedTeacher ?? TeacherName(name: 'Staff'),
              frequency: Frequency.weekly,
              type: Type.other,
              room: 'Room 1',
              format: 'On-site',
            );
            provider.addEntry(newEntry);
          },
          child: const Text('Add Entry'),
        ),
      ],
    );
  }
}

class _SubjectsPane extends StatelessWidget {
  final List<Subject> subjects;

  const _SubjectsPane({required this.subjects});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CupertinoColors.systemGrey6,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const Text(
            'Subjects',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          ...subjects.map(
            (Subject s) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Text(s.name, style: const TextStyle(fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }
}
