import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/role_selection.dart';

class MyTimetableScreen extends StatelessWidget {
  const MyTimetableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final bool enabled = provider.isPersonalizationEnabled;
    final List<TimeTableEntry> entries =
        provider.currentTimeTable?.entries ?? <TimeTableEntry>[];

    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(middle: Text('My Timetable')),
      child: SafeArea(
        child: enabled
            ? _PersonalizedBody(entries: entries, provider: provider)
            : _DisabledBody(),
      ),
    );
  }
}

class _DisabledBody extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: const <Widget>[
            Text(
              'Personalization is available when installed as a mobile PWA.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}

class _PersonalizedBody extends StatelessWidget {
  final List<TimeTableEntry> entries;
  final BaseProvider provider;

  const _PersonalizedBody({required this.entries, required this.provider});

  String _fmt(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.all(12.0),
          child: Row(
            children: <Widget>[
              Expanded(
                child: CupertinoButton(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  color: CupertinoColors.systemBlue,
                  borderRadius: BorderRadius.circular(10),
                  onPressed: () {
                    Navigator.of(context).push(
                      CupertinoPageRoute<void>(
                        builder: (_) => const RoleSelectionScreen(),
                      ),
                    );
                  },
                  child: const Text('Browse timetables to import'),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: entries.isEmpty
              ? Center(
                  child: Text(
                    'No classes yet. Import from a teacher or field.',
                    style: TextStyle(
                      color: CupertinoColors.systemGrey.darkColor,
                    ),
                  ),
                )
              : ListView.separated(
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
      ],
    );
  }
}
