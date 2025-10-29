import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay; // for formatting times
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';

class TeacherTimeTableScreen extends StatelessWidget {
  const TeacherTimeTableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final DataProvider provider = AppScope.of(context);
    final List<TimeTableEntry> entries =
        provider.currentTimeTable?.entries ?? <TimeTableEntry>[];
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Teacher Timetable'),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            children: <Widget>[
              Expanded(
                child: ListView.separated(
                  itemBuilder: (BuildContext context, int index) {
                    final TimeTableEntry e = entries[index];
                    return _EntryTile(
                      entry: e,
                      onDelete: () => provider.removeEntry(e.id),
                    );
                  },
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemCount: entries.length,
                ),
              ),
              const SizedBox(height: 8),
              CupertinoButton(
                onPressed: () {
                  // Simple demo add
                  final TimeTableEntry newEntry = TimeTableEntry(
                    id: DateTime.now().millisecondsSinceEpoch,
                    day: Day.friday,
                    interval: TimeInterval(
                      start: const TimeOfDay(hour: 16, minute: 0),
                      end: const TimeOfDay(hour: 18, minute: 0),
                    ),
                    subjectName: 'New Session',
                    teacher:
                        provider.selectedTeacher ??
                        TeacherName(name: 'Unknown'),
                    frequency: Frequency.weekly,
                    type: Type.other,
                    room: 'N/A',
                    format: 'On-site',
                  );
                  provider.addEntry(newEntry);
                },
                child: const Text('Add Entry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  final TimeTableEntry entry;
  final VoidCallback onDelete;

  const _EntryTile({required this.entry, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final String time =
        '${entry.interval.start.format(context)} - ${entry.interval.end.format(context)}';
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
                  entry.subjectName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${entry.day.name.toUpperCase()} • $time • ${entry.room}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: CupertinoColors.inactiveGray,
                  ),
                ),
              ],
            ),
          ),
          CupertinoButton(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            onPressed: onDelete,
            child: const Icon(CupertinoIcons.delete, size: 20),
          ),
        ],
      ),
    );
  }
}
