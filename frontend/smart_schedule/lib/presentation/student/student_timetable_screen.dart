import 'package:flutter/cupertino.dart';
 import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';

class StudentTimeTableScreen extends StatefulWidget {
  const StudentTimeTableScreen({super.key});

  @override
  State<StudentTimeTableScreen> createState() => _StudentTimeTableScreenState();
}

class _StudentTimeTableScreenState extends State<StudentTimeTableScreen> {
  final Set<int> _selectedOptionalLectures = <int>{};

  @override
  Widget build(BuildContext context) {
    final DataProvider provider = AppScope.of(context);
    final List<TimeTableEntry> entries =
        provider.currentTimeTable?.entries ?? <TimeTableEntry>[];
    final subjects = provider.subjects;

    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: const Text('My Schedule'),
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          child: const Icon(CupertinoIcons.refresh),
          onPressed: () {
            // Refresh functionality
          },
        ),
      ),
      child: SafeArea(
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            final bool isWideScreen = constraints.maxWidth >= 800;

            return isWideScreen
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Expanded(
                        flex: 2,
                        child: _TimetableView(
                          entries: entries,
                          provider: provider,
                        ),
                      ),
                      Container(
                        width: 1,
                        color: CupertinoColors.separator,
                      ),
                      SizedBox(
                        width: 380,
                        child: _OptionalLecturesPanel(
                          subjects: subjects,
                          selectedLectures: _selectedOptionalLectures,
                          onToggleLecture: (int id) {
                            setState(() {
                              if (_selectedOptionalLectures.contains(id)) {
                                _selectedOptionalLectures.remove(id);
                              } else {
                                _selectedOptionalLectures.add(id);
                              }
                            });
                          },
                        ),
                      ),
                    ],
                  )
                : Column(
                    children: <Widget>[
                      Expanded(
                        flex: 3,
                        child: _TimetableView(
                          entries: entries,
                          provider: provider,
                        ),
                      ),
                      Container(
                        height: 1,
                        color: CupertinoColors.separator,
                      ),
                      Expanded(
                        flex: 2,
                        child: _OptionalLecturesPanel(
                          subjects: subjects,
                          selectedLectures: _selectedOptionalLectures,
                          onToggleLecture: (int id) {
                            setState(() {
                              if (_selectedOptionalLectures.contains(id)) {
                                _selectedOptionalLectures.remove(id);
                              } else {
                                _selectedOptionalLectures.add(id);
                              }
                            });
                          },
                        ),
                      ),
                    ],
                  );
          },
        ),
      ),
    );
  }
}

// Timetable View Widget
class _TimetableView extends StatelessWidget {
  final List<TimeTableEntry> entries;
  final DataProvider provider;

  const _TimetableView({
    required this.entries,
    required this.provider,
  });

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

  @override
  Widget build(BuildContext context) {
    // Group entries by day
    final Map<Day, List<TimeTableEntry>> entriesByDay = <Day, List<TimeTableEntry>>{};
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

    return Container(
      color: CupertinoColors.systemGroupedBackground,
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16.0, 8.0, 16.0, 16.0),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
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
                          child: Text(
                            dayName,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: CupertinoColors.black,
                            ),
                          ),
                        ),
                        if (dayEntries.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(20),
                            decoration: BoxDecoration(
                              color: CupertinoColors.systemGrey6,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                'No classes scheduled',
                                style: TextStyle(
                                  color: CupertinoColors.systemGrey.darkColor,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          )
                        else
                          ...dayEntries.map(
                            (entry) => Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: _TimetableCard(
                                entry: entry,
                                typeColor: _getTypeColor(entry.type),
                                typeLabel: _getTypeLabel(entry.type),
                                formatTime: _formatTimeOfDay,
                                onDelete: () => provider.removeEntry(entry.id),
                              ),
                            ),
                          ),
                      ],
                    ),
                  );
                },
                childCount: days.length,
              ),
            ),
          ),
        ],
      ),
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

// Timetable Card Widget
class _TimetableCard extends StatelessWidget {
  final TimeTableEntry entry;
  final Color typeColor;
  final String typeLabel;
  final String Function(TimeOfDay) formatTime;
  final VoidCallback onDelete;

  const _TimetableCard({
    required this.entry,
    required this.typeColor,
    required this.typeLabel,
    required this.formatTime,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CupertinoColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          left: BorderSide(
            color: typeColor,
            width: 4,
          ),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            // Time column
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  formatTime(entry.interval.start),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: CupertinoColors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  formatTime(entry.interval.end),
                  style: TextStyle(
                    fontSize: 14,
                    color: CupertinoColors.systemGrey.darkColor,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            // Subject details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    entry.subjectName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: CupertinoColors.black,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
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
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Icon(
                        CupertinoIcons.location_solid,
                        size: 14,
                        color: CupertinoColors.systemGrey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        entry.room,
                        style: TextStyle(
                          fontSize: 13,
                          color: CupertinoColors.systemGrey.darkColor,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    entry.teacher.name,
                    style: TextStyle(
                      fontSize: 13,
                      color: CupertinoColors.systemGrey.darkColor,
                    ),
                  ),
                ],
              ),
            ),
            // Delete button
            CupertinoButton(
              padding: EdgeInsets.zero,
              child: const Icon(
                CupertinoIcons.trash,
                size: 20,
                color: CupertinoColors.systemGrey,
              ),
              onPressed: onDelete,
            ),
          ],
        ),
      ),
    );
  }
}

// Optional Lectures Panel
class _OptionalLecturesPanel extends StatelessWidget {
  final List<Subject> subjects;
  final Set<int> selectedLectures;
  final void Function(int) onToggleLecture;

  const _OptionalLecturesPanel({
    required this.subjects,
    required this.selectedLectures,
    required this.onToggleLecture,
  });

  @override
  Widget build(BuildContext context) {
    // Mock optional lectures data
    final optionalLectures = [
      _OptionalLecture(
        id: 1,
        name: 'Advanced Algorithms',
        teacher: 'Prof. Smith',
        credits: 6,
        type: 'Optional',
      ),
      _OptionalLecture(
        id: 2,
        name: 'Machine Learning',
        teacher: 'Dr. Johnson',
        credits: 6,
        type: 'Optional',
      ),
      _OptionalLecture(
        id: 3,
        name: 'Web Development',
        teacher: 'Prof. Williams',
        credits: 5,
        type: 'Optional',
      ),
      _OptionalLecture(
        id: 4,
        name: 'Database Design',
        teacher: 'Dr. Brown',
        credits: 5,
        type: 'Optional',
      ),
      _OptionalLecture(
        id: 5,
        name: 'Mobile Development',
        teacher: 'Prof. Davis',
        credits: 6,
        type: 'Optional',
      ),
      _OptionalLecture(
        id: 6,
        name: 'Computer Graphics',
        teacher: 'Dr. Wilson',
        credits: 5,
        type: 'Optional',
      ),
    ];

    return Container(
      color: CupertinoColors.systemGroupedBackground,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: CupertinoColors.white,
              border: Border(
                bottom: BorderSide(
                  color: CupertinoColors.separator,
                  width: 0.5,
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Optional Lectures',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: CupertinoColors.black,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Select the optional courses you want to attend',
                  style: TextStyle(
                    fontSize: 14,
                    color: CupertinoColors.systemGrey.darkColor,
                  ),
                ),
                const SizedBox(height: 12),
                _SelectionSummary(
                  selected: selectedLectures.length,
                  total: optionalLectures.length,
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: optionalLectures.length,
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final lecture = optionalLectures[index];
                final isSelected = selectedLectures.contains(lecture.id);

                return _OptionalLectureCard(
                  lecture: lecture,
                  isSelected: isSelected,
                  onToggle: () => onToggleLecture(lecture.id),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// Selection Summary Widget
class _SelectionSummary extends StatelessWidget {
  final int selected;
  final int total;

  const _SelectionSummary({
    required this.selected,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: CupertinoColors.systemBlue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            CupertinoIcons.checkmark_circle_fill,
            size: 16,
            color: CupertinoColors.systemBlue,
          ),
          const SizedBox(width: 6),
          Text(
            '$selected of $total selected',
            style: const TextStyle(
              fontSize: 13,
              color: CupertinoColors.systemBlue,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// Optional Lecture Card
class _OptionalLectureCard extends StatelessWidget {
  final _OptionalLecture lecture;
  final bool isSelected;
  final VoidCallback onToggle;

  const _OptionalLectureCard({
    required this.lecture,
    required this.isSelected,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggle,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: CupertinoColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? CupertinoColors.systemBlue
                : CupertinoColors.separator,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            // Checkbox
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isSelected
                    ? CupertinoColors.systemBlue
                    : CupertinoColors.white,
                border: Border.all(
                  color: isSelected
                      ? CupertinoColors.systemBlue
                      : CupertinoColors.systemGrey3,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(6),
              ),
              child: isSelected
                  ? const Icon(
                      CupertinoIcons.check_mark,
                      size: 16,
                      color: CupertinoColors.white,
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            // Lecture details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    lecture.name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? CupertinoColors.activeBlue
                          : CupertinoColors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    lecture.teacher,
                    style: TextStyle(
                      fontSize: 13,
                      color: CupertinoColors.systemGrey.darkColor,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
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
                          '${lecture.credits} credits',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
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
                          lecture.type,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Optional Lecture Model
class _OptionalLecture {
  final int id;
  final String name;
  final String teacher;
  final int credits;
  final String type;

  _OptionalLecture({
    required this.id,
    required this.name,
    required this.teacher,
    required this.credits,
    required this.type,
  });
}
