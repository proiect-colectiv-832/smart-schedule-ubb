import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/utils/platform_service.dart';

class ReadonlyTimetableScreen extends StatelessWidget {
  final TimeTable timetable;
  const ReadonlyTimetableScreen({super.key, required this.timetable});

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final entries = timetable.entries;
    final StudentTimeTable? studentTable = timetable is StudentTimeTable
        ? timetable as StudentTimeTable
        : null;
    final String title = studentTable != null
        ? '${studentTable.field.name} • Year ${studentTable.year} • ${studentTable.groupName}'
        : 'Group Timetable';

    final Widget content = CupertinoPageScaffold(
      backgroundColor: CupertinoColors.systemGroupedBackground,
      navigationBar: null,
      child: SafeArea(
        child: Container(
          color: CupertinoColors.systemGroupedBackground,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
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
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: CupertinoColors.black,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (studentTable != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Group schedule',
                          style: TextStyle(
                            fontSize: 15,
                            color: CupertinoColors.systemGrey.darkColor,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16.0, 8.0, 16.0, 16.0),
                sliver: _buildTimetableGrid(entries, provider, studentTable),
              ),
            ],
          ),
        ),
      ),
    );

    if (!PlatformService.isWeb) {
      return PopScope(canPop: false, child: content);
    }
    return content;
  }

  Widget _buildTimetableGrid(
    List<TimeTableEntry> entries,
    BaseProvider provider,
    StudentTimeTable? studentTable,
  ) {
    // Group entries by day
    final Map<Day, List<TimeTableEntry>> entriesByDay =
        <Day, List<TimeTableEntry>>{};
    for (final entry in entries) {
      entriesByDay.putIfAbsent(entry.day, () => <TimeTableEntry>[]).add(entry);
    }

    // Sort each day's entries by time
    for (final dayEntries in entriesByDay.values) {
      dayEntries.sort((a, b) {
        final aMinutes = a.interval.start.hour * 60 + a.interval.start.minute;
        final bMinutes = b.interval.start.hour * 60 + b.interval.start.minute;
        return aMinutes.compareTo(bMinutes);
      });
    }

    final days = [
      Day.monday,
      Day.tuesday,
      Day.wednesday,
      Day.thursday,
      Day.friday,
      Day.saturday,
      Day.sunday,
    ];

    return SliverList(
      delegate: SliverChildBuilderDelegate((context, index) {
        final day = days[index];
        final dayEntries = entriesByDay[day] ?? <TimeTableEntry>[];
        final dayName = _formatDayName(day);

        return Padding(
          padding: const EdgeInsets.only(bottom: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8.0,
                  vertical: 8.0,
                ),
                child: Row(
                  children: [
                    Text(
                      dayName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: CupertinoColors.black,
                      ),
                    ),
                    const Spacer(),
                    if (dayEntries.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: CupertinoColors.systemBlue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${dayEntries.length} ${dayEntries.length == 1 ? 'class' : 'classes'}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: CupertinoColors.systemBlue,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (dayEntries.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: CupertinoColors.systemGrey6,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(
                          CupertinoIcons.moon_stars,
                          size: 32,
                          color: CupertinoColors.systemGrey.darkColor,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Free day - No classes scheduled',
                          style: TextStyle(
                            color: CupertinoColors.systemGrey.darkColor,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ...dayEntries.map(
                  (entry) => Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: _GroupClassCard(
                      entry: entry,
                      onAdd: provider.isPersonalizationEnabled
                          ? () => provider.addEntry(entry)
                          : null,
                    ),
                  ),
                ),
            ],
          ),
        );
      }, childCount: days.length),
    );
  }

  String _formatDayName(Day day) {
    switch (day) {
      case Day.monday:
        return 'Monday';
      case Day.tuesday:
        return 'Tuesday';
      case Day.wednesday:
        return 'Wednesday';
      case Day.thursday:
        return 'Thursday';
      case Day.friday:
        return 'Friday';
      case Day.saturday:
        return 'Saturday';
      case Day.sunday:
        return 'Sunday';
    }
  }
}

// Group Class Card Widget (same design as teacher timetable)
class _GroupClassCard extends StatelessWidget {
  final TimeTableEntry entry;
  final VoidCallback? onAdd;

  const _GroupClassCard({required this.entry, this.onAdd});

  String _formatTimeOfDay(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Color _getTypeColor(Type type) {
    switch (type) {
      case Type.lecture:
        return CupertinoColors.systemBlue;
      case Type.seminar:
        return CupertinoColors.systemGreen;
      case Type.lab:
        return CupertinoColors.systemOrange;
      case Type.other:
        return CupertinoColors.systemPurple;
    }
  }

  String _getTypeLabel(Type type) {
    switch (type) {
      case Type.lecture:
        return 'Lecture';
      case Type.seminar:
        return 'Seminar';
      case Type.lab:
        return 'Lab';
      case Type.other:
        return 'Other';
    }
  }

  IconData _getTypeIcon(Type type) {
    switch (type) {
      case Type.lecture:
        return CupertinoIcons.book;
      case Type.seminar:
        return CupertinoIcons.person_3;
      case Type.lab:
        return CupertinoIcons.lab_flask;
      case Type.other:
        return CupertinoIcons.square_grid_2x2;
    }
  }

  String _getFrequencyLabel(Frequency frequency) {
    switch (frequency) {
      case Frequency.weekly:
        return 'Weekly';
      case Frequency.oddweeks:
        return 'Odd weeks';
      case Frequency.evenweeks:
        return 'Even weeks';
    }
  }

  @override
  Widget build(BuildContext context) {
    final typeColor = _getTypeColor(entry.type);
    final typeLabel = _getTypeLabel(entry.type);
    final typeIcon = _getTypeIcon(entry.type);

    return Container(
      decoration: BoxDecoration(
        color: CupertinoColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: typeColor, width: 5)),
        boxShadow: [
          BoxShadow(
            color: CupertinoColors.systemGrey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Type icon
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: typeColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(typeIcon, size: 24, color: typeColor),
                ),
                const SizedBox(width: 12),
                // Subject name and type
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        entry.subjectName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
                          color: CupertinoColors.black,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: typeColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          typeLabel,
                          style: TextStyle(
                            fontSize: 12,
                            color: typeColor,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                // Add button (only on mobile PWA)
                if (onAdd != null)
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    child: const Icon(
                      CupertinoIcons.add_circled,
                      size: 24,
                      color: CupertinoColors.systemBlue,
                    ),
                    onPressed: onAdd,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            // Divider
            Container(height: 1, color: CupertinoColors.separator),
            const SizedBox(height: 12),
            // Time and location details
            Row(
              children: [
                // Time
                Expanded(
                  child: Row(
                    children: [
                      const Icon(
                        CupertinoIcons.clock,
                        size: 16,
                        color: CupertinoColors.systemGrey,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '${_formatTimeOfDay(entry.interval.start)} - ${_formatTimeOfDay(entry.interval.end)}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: CupertinoColors.systemGrey.darkColor,
                        ),
                      ),
                    ],
                  ),
                ),
                // Location
                Row(
                  children: [
                    const Icon(
                      CupertinoIcons.location_solid,
                      size: 16,
                      color: CupertinoColors.systemGrey,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      entry.room,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.systemGrey.darkColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Format
            Row(
              children: [
                const Icon(
                  CupertinoIcons.antenna_radiowaves_left_right,
                  size: 16,
                  color: CupertinoColors.systemGrey,
                ),
                const SizedBox(width: 6),
                Text(
                  entry.format,
                  style: TextStyle(
                    fontSize: 14,
                    color: CupertinoColors.systemGrey.darkColor,
                  ),
                ),
                const Spacer(),
                // Frequency badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: CupertinoColors.systemGrey6,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _getFrequencyLabel(entry.frequency),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: const Color.fromARGB(255, 62, 62, 62),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Teacher
            Row(
              children: [
                const Icon(
                  CupertinoIcons.person,
                  size: 16,
                  color: CupertinoColors.systemGrey,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    entry.teacher.name,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      color: CupertinoColors.systemGrey.darkColor,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
