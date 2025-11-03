import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';

class ReadonlyTimetableScreen extends StatelessWidget {
  final TimeTable timetable;
  const ReadonlyTimetableScreen({super.key, required this.timetable});

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final entries = timetable.entries;
    final subjects = <String, List<TimeTableEntry>>{};
    for (final e in entries) {
      subjects.putIfAbsent(e.subjectName, () => <TimeTableEntry>[]).add(e);
    }
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Group Timetable'),
      ),
      child: SafeArea(
        child: Column(
          children: <Widget>[
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.all(12),
                itemBuilder: (BuildContext context, int index) {
                  final e = entries[index];
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
                                '${e.day.name.toUpperCase()} • ${_fmt(e.interval.start)} - ${_fmt(e.interval.end)} • ${e.room}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: CupertinoColors.inactiveGray,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (provider.isPersonalizationEnabled)
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 6,
                            ),
                            onPressed: () => provider.addEntry(e),
                            child: const Text('Add'),
                          ),
                      ],
                    ),
                  );
                },
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemCount: entries.length,
              ),
            ),
            if (provider.isPersonalizationEnabled)
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: CupertinoButton.filled(
                  onPressed: () {
                    // Add a subject: take the first subject as sample chooser; simplify by showing an action sheet of subjects
                    showCupertinoModalPopup<void>(
                      context: context,
                      builder: (_) => CupertinoActionSheet(
                        title: const Text('Add Subject'),
                        actions: subjects.keys
                            .map(
                              (s) => CupertinoActionSheetAction(
                                onPressed: () {
                                  final entriesOfSubject = subjects[s]!;
                                  provider.addSubject(
                                    Subject(
                                      name: s,
                                      id: 0,
                                      entries: entriesOfSubject,
                                    ),
                                  );
                                  Navigator.of(context).pop();
                                },
                                child: Text(s),
                              ),
                            )
                            .toList(),
                        cancelButton: CupertinoActionSheetAction(
                          onPressed: () => Navigator.of(context).pop(),
                          isDestructiveAction: true,
                          child: const Text('Cancel'),
                        ),
                      ),
                    );
                  },
                  child: const Text('Add Subject'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
