import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/utils/platform_service.dart';

class StudentTimeTableScreen extends StatefulWidget {
  const StudentTimeTableScreen({super.key});

  @override
  State<StudentTimeTableScreen> createState() => _StudentTimeTableScreenState();
}

class _StudentTimeTableScreenState extends State<StudentTimeTableScreen> {
  final Set<int> _selectedOptionalLectures = <int>{};

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final List<TimeTableEntry> entries =
        provider.currentTimeTable?.entries ?? <TimeTableEntry>[];
    final subjects = provider.subjects;
    final StudentTimeTable? studentTable =
        provider.currentTimeTable is StudentTimeTable
        ? provider.currentTimeTable as StudentTimeTable
        : null;
    final String timetableTitle = studentTable != null
        ? '${studentTable.field.name} • Year ${studentTable.year} • ${studentTable.groupName}'
        : 'Student Timetable';

    return CupertinoPageScaffold(
      navigationBar: PlatformService.isWeb
          ? null
          : CupertinoNavigationBar(
              middle: Text(
                timetableTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: provider.isPersonalizationEnabled
                  ? CupertinoButton(
                      padding: EdgeInsets.zero,
                      child: const Icon(CupertinoIcons.refresh),
                      onPressed: () {},
                    )
                  : null,
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
                          timetable: studentTable,
                          title: timetableTitle,
                        ),
                      ),
                      Container(width: 1, color: CupertinoColors.separator),
                      if (provider.isPersonalizationEnabled)
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
                          timetable: studentTable,
                          title: timetableTitle,
                        ),
                      ),
                      if (provider.isPersonalizationEnabled) ...[
                        Container(height: 1, color: CupertinoColors.separator),
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
  final BaseProvider provider;
  final StudentTimeTable? timetable;
  final String title;

  const _TimetableView({
    required this.entries,
    required this.provider,
    required this.timetable,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    final Map<Day, List<TimeTableEntry>> entriesByDay =
        <Day, List<TimeTableEntry>>{};
    for (final entry in entries) {
      entriesByDay.putIfAbsent(entry.day, () => <TimeTableEntry>[]).add(entry);
    }

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

    final int totalClasses = entries.length;
    final bool canModify = provider.isPersonalizationEnabled;

    return Container(
      color: CupertinoColors.systemGroupedBackground,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: CupertinoColors.black,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (timetable != null)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _InfoPill(
                          icon: CupertinoIcons.book,
                          text: timetable!.field.name,
                        ),
                        _InfoPill(
                          icon: CupertinoIcons.calendar,
                          text: 'Year ${timetable!.year}',
                        ),
                        _InfoPill(
                          icon: CupertinoIcons.person_2,
                          text: 'Group ${timetable!.groupName}',
                        ),
                      ],
                    ),
                  if (timetable != null) const SizedBox(height: 8),
                  _InfoPill(
                    icon: CupertinoIcons.square_list,
                    text:
                        '$totalClasses ${totalClasses == 1 ? 'class' : 'classes'} this week',
                    highlighted: true,
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16.0, 8.0, 16.0, 16.0),
            sliver: SliverList(
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
                              _InfoPill(
                                icon: CupertinoIcons.square_list,
                                text:
                                    '${dayEntries.length} ${dayEntries.length == 1 ? 'class' : 'classes'}',
                                compact: true,
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
                            child: _StudentClassCard(
                              entry: entry,
                              onDelete: canModify
                                  ? () => provider.removeEntry(entry.id)
                                  : null,
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              }, childCount: days.length),
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

class _InfoPill extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool highlighted;
  final bool compact;

  const _InfoPill({
    required this.icon,
    required this.text,
    this.highlighted = false,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final Color backgroundColor = highlighted
        ? CupertinoColors.systemBlue.withOpacity(0.15)
        : CupertinoColors.systemGrey6;
    final Color foregroundColor = highlighted
        ? CupertinoColors.systemBlue
        : CupertinoColors.systemGrey.darkColor;

    final EdgeInsets padding = compact
        ? const EdgeInsets.symmetric(horizontal: 10, vertical: 4)
        : const EdgeInsets.symmetric(horizontal: 12, vertical: 6);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: foregroundColor),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              fontSize: compact ? 12 : 13,
              fontWeight: highlighted ? FontWeight.w600 : FontWeight.w500,
              color: foregroundColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _StudentClassCard extends StatelessWidget {
  final TimeTableEntry entry;
  final VoidCallback? onDelete;

  const _StudentClassCard({required this.entry, this.onDelete});

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
    final Color typeColor = _getTypeColor(entry.type);
    final IconData typeIcon = _getTypeIcon(entry.type);
    final String typeLabel = _getTypeLabel(entry.type);

    return Container(
      decoration: BoxDecoration(
        color: CupertinoColors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: typeColor, width: 5)),
        boxShadow: [
          BoxShadow(
            color: CupertinoColors.systemGrey.withOpacity(0.08),
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
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: typeColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(typeIcon, size: 24, color: typeColor),
                ),
                const SizedBox(width: 12),
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
                          color: typeColor.withOpacity(0.12),
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
                if (onDelete != null)
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    minSize: 32,
                    child: const Icon(
                      CupertinoIcons.trash,
                      size: 20,
                      color: CupertinoColors.systemGrey,
                    ),
                    onPressed: onDelete,
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Container(height: 1, color: CupertinoColors.separator),
            const SizedBox(height: 12),
            Row(
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
                const Spacer(),
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
            const SizedBox(height: 8),
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
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
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

  const _SelectionSummary({required this.selected, required this.total});

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
