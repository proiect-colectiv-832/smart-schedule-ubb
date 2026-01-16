import 'dart:convert';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:flutter/services.dart';
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/my/subjects_screen.dart';
import 'package:smart_schedule/presentation/my/download_timetable_button.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/utils/mobile_route.dart';
import 'package:smart_schedule/utils/pwa_identity_service.dart';
import 'package:smart_schedule/utils/timetable_exporter.dart';
import 'package:overlay_support/overlay_support.dart';
import 'package:url_launcher/url_launcher.dart';

class MyTimetableScreen extends StatefulWidget {
  const MyTimetableScreen({super.key});

  @override
  State<MyTimetableScreen> createState() => _MyTimetableScreenState();
}

class _MyTimetableScreenState extends State<MyTimetableScreen> {
  @override
  void initState() {
    super.initState();
    
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final BaseProvider provider = AppScope.of(context);
      if (provider is MobileDataProvider) {
        
        if (provider.currentTimeTable is TeacherTimeTable) {
          await provider.restorePersonalizedIfAny();
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final bool enabled = provider.isPersonalizationEnabled;

    
    
    final bool isTeacherTimeTable =
        provider.currentTimeTable is TeacherTimeTable;
    final List<TimeTableEntry> entries = isTeacherTimeTable
        ? <TimeTableEntry>[]
        : (provider.currentTimeTable?.entries ?? <TimeTableEntry>[]);

    final Widget content = CupertinoPageScaffold(
      backgroundColor: CupertinoColors.systemGroupedBackground,
      navigationBar: null,
      child: SafeArea(
        child: Container(
          color: CupertinoColors.systemGroupedBackground,
          child: enabled
              ? _PersonalizedBody(entries: entries, provider: provider)
              : _DisabledBody(),
        ),
      ),
    );

    if (!PlatformService.isWeb) {
      return PopScope(canPop: false, child: content);
    }
    return content;
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

class _PersonalizedBody extends StatefulWidget {
  final List<TimeTableEntry> entries;
  final BaseProvider provider;

  const _PersonalizedBody({required this.entries, required this.provider});

  @override
  State<_PersonalizedBody> createState() => _PersonalizedBodyState();
}

class _PersonalizedBodyState extends State<_PersonalizedBody> {
  final GlobalKey _repaintBoundaryKey = GlobalKey();

  @override
  Widget build(BuildContext context) {
    final entries = widget.entries;
    final provider = widget.provider;
    
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

    
    final markdownText = TimetableExporter.generateMarkdownTable(entries);

    return Stack(
      children: [
        
        Positioned(
          left: -10000,
          top: -10000,
          child: RepaintBoundary(
            key: _repaintBoundaryKey,
            child: Container(
              color: const Color(0xFFFFFFFF),
              padding: const EdgeInsets.all(24),
              child: _TimetableTableWidget(markdownText: markdownText),
            ),
          ),
        ),
        
        CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (!PlatformService.isWeb)
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
                        if (!PlatformService.isWeb) const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'My Timetable',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: CupertinoColors.black,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Personalized schedule',
                      style: TextStyle(
                        fontSize: 15,
                        color: CupertinoColors.systemGrey.darkColor,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: CupertinoButton.filled(
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 24,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            onPressed: () {
                              Navigator.of(context).push(
                                createMobileRoute<void>(
                                  builder: (_) => const SubjectsScreen(),
                                ),
                              );
                            },
                            child: const Text(
                              'Add Subjects',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: CupertinoButton(
                            color: CupertinoColors.destructiveRed,
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 24,
                            ),
                            borderRadius: BorderRadius.circular(10),
                            onPressed: () {
                              showCupertinoDialog(
                                context: context,
                                builder: (BuildContext dialogContext) {
                                  return CupertinoAlertDialog(
                                    title: const Text('Delete All Entries'),
                                    content: const Text(
                                      'Are you sure you want to delete all entries from your timetable? This action cannot be undone.',
                                    ),
                                    actions: <CupertinoDialogAction>[
                                      CupertinoDialogAction(
                                        isDefaultAction: true,
                                        onPressed: () {
                                          Navigator.of(dialogContext).pop();
                                        },
                                        child: const Text('Cancel'),
                                      ),
                                      CupertinoDialogAction(
                                        isDestructiveAction: true,
                                        onPressed: () {
                                          Navigator.of(dialogContext).pop();
                                          provider.clearAllEntries();
                                        },
                                        child: const Text('Delete All'),
                                      ),
                                    ],
                                  );
                                },
                              );
                            },
                            child: const Text(
                              'Delete All',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: CupertinoColors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    
                    SizedBox(
                      width: double.infinity,
                      child: CupertinoButton(
                        color: CupertinoColors.activeGreen,
                        padding: const EdgeInsets.symmetric(
                          vertical: 12,
                          horizontal: 24,
                        ),
                        borderRadius: BorderRadius.circular(10),
                        onPressed: () async {
                          try {
                            final String? userId =
                                await PwaIdentityService.ensureUserId();
                            if (userId == null) {
                              toast(
                                'Calendar subscription is only available in PWA mode',
                              );
                              return;
                            }
                            await provider.api.subscribeToCalendar(userId);
                            if (PlatformService.isAndroid) {
                              toast('Opening Outlook...');
                            } else {
                              toast('Opening calendar subscription...');
                            }
                          } catch (e) {
                            toast('Failed to open calendar: ${e.toString()}');
                          }
                        },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              PlatformService.isAndroid
                                  ? CupertinoIcons.mail
                                  : CupertinoIcons.calendar_badge_plus,
                              size: 20,
                              color: CupertinoColors.white,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              PlatformService.isAndroid
                                  ? 'Add to Outlook'
                                  : 'Add to Calendar',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: CupertinoColors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    DownloadTimetableButton(
                      entries: entries,
                      repaintBoundaryKey: _repaintBoundaryKey,
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
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: CupertinoColors.systemBlue
                                        .withOpacity(0.1),
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
                                      color:
                                          CupertinoColors.systemGrey.darkColor,
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
                              child: _MyTimetableCard(
                                entry: entry,
                                onDelete: () => provider.removeEntry(entry.id),
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
      ],
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

class _MyTimetableCard extends StatefulWidget {
  final TimeTableEntry entry;
  final VoidCallback onDelete;

  const _MyTimetableCard({required this.entry, required this.onDelete});

  @override
  State<_MyTimetableCard> createState() => _MyTimetableCardState();
}

class _MyTimetableCardState extends State<_MyTimetableCard> {
  Map<String, dynamic>? _locationsData;

  @override
  void initState() {
    super.initState();
    _loadLocations();
  }

  Future<void> _loadLocations() async {
    try {
      final String jsonString = await rootBundle.loadString(
        'lib/data/locations.json',
      );
      final Map<String, dynamic> data = jsonDecode(jsonString);
      setState(() {
        _locationsData = data;
      });
    } catch (e) {
      
    }
  }

  String? _getAddressForRoom(String room) {
    if (_locationsData == null) return null;
    final rooms = _locationsData!['rooms'] as Map<String, dynamic>?;
    if (rooms == null) return null;
    final roomData = rooms[room] as Map<String, dynamic>?;
    if (roomData == null) return null;
    return roomData['address'] as String?;
  }

  Future<void> _openGoogleMaps(String address) async {
    final encodedAddress = Uri.encodeComponent(address);
    final url = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$encodedAddress',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

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
    final typeColor = _getTypeColor(widget.entry.type);
    final typeLabel = _getTypeLabel(widget.entry.type);
    final typeIcon = _getTypeIcon(widget.entry.type);
    final address = _getAddressForRoom(widget.entry.room);
    final canOpenMaps = address != null && address.isNotEmpty;
    final String? roomAddress = canOpenMaps ? address : null;

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
                        widget.entry.subjectName,
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
                
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  child: const Icon(
                    CupertinoIcons.trash,
                    size: 20,
                    color: CupertinoColors.systemGrey,
                  ),
                  onPressed: widget.onDelete,
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            Container(height: 1, color: CupertinoColors.separator),
            const SizedBox(height: 12),
            
            Row(
              children: [
                
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
                        '${_formatTimeOfDay(widget.entry.interval.start)} - ${_formatTimeOfDay(widget.entry.interval.end)}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: CupertinoColors.systemGrey.darkColor,
                        ),
                      ),
                    ],
                  ),
                ),
                
                Row(
                  children: [
                    const Icon(
                      CupertinoIcons.location_solid,
                      size: 16,
                      color: CupertinoColors.systemGrey,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      widget.entry.room,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.systemGrey.darkColor,
                      ),
                    ),
                    if (canOpenMaps && roomAddress != null) ...[
                      const SizedBox(width: 8),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        minSize: 0,
                        onPressed: () => _openGoogleMaps(roomAddress),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: CupertinoColors.systemBlue.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                CupertinoIcons.map,
                                size: 14,
                                color: CupertinoColors.systemBlue,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Maps',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: CupertinoColors.systemBlue,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
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
                  widget.entry.format,
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
                    _getFrequencyLabel(widget.entry.frequency),
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
                    widget.entry.teacher.name,
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


class _TimetableTableWidget extends StatelessWidget {
  final String markdownText;

  const _TimetableTableWidget({required this.markdownText});

  @override
  Widget build(BuildContext context) {
    
    final lines = markdownText
        .split('\n')
        .where((line) => line.isNotEmpty)
        .toList();

    if (lines.length < 2) {
      return const SizedBox(
        width: 1200,
        height: 800,
        child: Center(child: Text('No data available')),
      );
    }

    
    final headerLine = lines[0];
    final headers = _parseTableRow(headerLine);

    
    final dataRows = lines.skip(2).map(_parseTableRow).toList();

    return Container(
      width: 1400,
      decoration: BoxDecoration(
        color: const Color(0xFFFFFFFF),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(color: Color(0xFF1976D2)),
            child: const Row(
              children: [
                Text(
                  'My Timetable',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFFFFFFF),
                  ),
                ),
              ],
            ),
          ),
          
          Table(
            border: TableBorder.all(color: const Color(0xFFE0E0E0)),
            columnWidths: const {
              0: FixedColumnWidth(100), 
              1: FixedColumnWidth(100), 
              2: FixedColumnWidth(100), 
              3: FixedColumnWidth(80), 
              4: FixedColumnWidth(80), 
              5: FixedColumnWidth(80), 
              6: FlexColumnWidth(2), 
              7: FlexColumnWidth(1.5), 
            },
            children: [
              
              TableRow(
                decoration: const BoxDecoration(color: Color(0xFFBBDEFB)),
                children: headers
                    .map(
                      (header) => Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          header.trim(),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Color(0xFF000000),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
              
              ...dataRows.asMap().entries.map((entry) {
                final index = entry.key;
                final row = entry.value;
                return TableRow(
                  decoration: BoxDecoration(
                    color: index.isEven
                        ? const Color(0xFFFFFFFF)
                        : const Color(0xFFF5F5F5),
                  ),
                  children: row
                      .map(
                        (cell) => Padding(
                          padding: const EdgeInsets.all(10),
                          child: Text(
                            cell.trim(),
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF000000),
                            ),
                          ),
                        ),
                      )
                      .toList(),
                );
              }),
            ],
          ),
        ],
      ),
    );
  }

  List<String> _parseTableRow(String row) {
    final cleaned = row.trim();
    if (cleaned.startsWith('|')) {
      return cleaned
          .substring(1, cleaned.length - (cleaned.endsWith('|') ? 1 : 0))
          .split('|')
          .map((cell) => cell.trim())
          .toList();
    }
    return <String>[];
  }
}
