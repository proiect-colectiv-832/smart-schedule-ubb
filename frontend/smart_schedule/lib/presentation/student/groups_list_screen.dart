import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/student/readonly_timetable_screen.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/utils/web_route.dart';

class GroupsListScreen extends StatefulWidget {
  const GroupsListScreen({super.key});

  @override
  State<GroupsListScreen> createState() => _GroupsListScreenState();
}

class _GroupsListScreenState extends State<GroupsListScreen> {
  bool _requested = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_requested) return;
    final BaseProvider provider = AppScope.of(context);
    if (provider.selectedField != null && provider.selectedYear != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        provider.loadFieldYearTimetables(
          field: provider.selectedField!,
          year: provider.selectedYear!,
        );
      });
      _requested = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final BaseProvider provider = AppScope.of(context);
    final Widget content = CupertinoPageScaffold(
      backgroundColor: CupertinoColors.white,
      navigationBar: null,
      child: SafeArea(
        child: provider.isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : Column(
                children: [
                  
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
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
                          'Select Group',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: CupertinoColors.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemBuilder: (BuildContext context, int index) {
                        final StudentTimeTable st =
                            provider.fieldYearTimetables[index];
                        return Container(
                          decoration: BoxDecoration(
                            color: CupertinoColors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: CupertinoColors.systemGrey4,
                              width: 1,
                            ),
                          ),
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: <Widget>[
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Text(
                                      st.groupName,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w600,
                                        color: CupertinoColors.black,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${st.field.name} • Year ${st.year}',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: CupertinoColors
                                            .systemGrey
                                            .darkColor,
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
                                color: CupertinoColors.activeBlue,
                                borderRadius: BorderRadius.circular(8),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    createWebAwareRoute<void>(
                                      builder: (_) => ReadonlyTimetableScreen(
                                        timetable: st,
                                      ),
                                    ),
                                  );
                                },
                                child: const Text(
                                  'View',
                                  style: TextStyle(
                                    color: CupertinoColors.white,
                                  ),
                                ),
                              ),
                              if (provider.isPersonalizationEnabled)
                                const SizedBox(width: 8),
                              if (provider.isPersonalizationEnabled)
                                CupertinoButton(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 6,
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                  onPressed: () {
                                    _showImportConfirmation(
                                      context,
                                      st,
                                      provider,
                                    );
                                  },
                                  child: const Text('Import all'),
                                ),
                            ],
                          ),
                        );
                      },
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemCount: provider.fieldYearTimetables.length,
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

  void _showImportConfirmation(
    BuildContext context,
    StudentTimeTable timetable,
    BaseProvider provider,
  ) {
    final List<TimeTableEntry> entries = List<TimeTableEntry>.from(
      timetable.entries,
    );
    final Set<int> selectedIds = entries.map((e) => e.id).toSet();

    showCupertinoModalPopup(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            final int selectedCount = selectedIds.length;
            return SafeArea(
              top: false,
              child: Container(
                height: MediaQuery.of(context).size.height * 0.7,
                decoration: const BoxDecoration(
                  color: CupertinoColors.systemBackground,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: CupertinoColors.systemGrey4,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Import classes from ${timetable.groupName}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$selectedCount of ${entries.length} selected',
                      style: TextStyle(
                        fontSize: 13,
                        color: CupertinoColors.systemGrey.darkColor,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: entries.isEmpty
                          ? const Center(
                              child: Text(
                                'No classes available',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: CupertinoColors.systemGrey,
                                ),
                              ),
                            )
                          : ListView.separated(
                              itemCount: entries.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final entry = entries[index];
                                final bool isChecked = selectedIds.contains(
                                  entry.id,
                                );
                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      if (isChecked) {
                                        selectedIds.remove(entry.id);
                                      } else {
                                        selectedIds.add(entry.id);
                                      }
                                    });
                                  },
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      CupertinoCheckbox(
                                        value: isChecked,
                                        onChanged: (bool? value) {
                                          setState(() {
                                            if (value == true) {
                                              selectedIds.add(entry.id);
                                            } else {
                                              selectedIds.remove(entry.id);
                                            }
                                          });
                                        },
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: _ImportEntryDetails(
                                          entry: entry,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: CupertinoButton(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            borderRadius: BorderRadius.circular(10),
                            color: CupertinoColors.systemGrey5,
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text(
                              'Cancel',
                              style: TextStyle(color: CupertinoColors.black),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: CupertinoButton.filled(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            borderRadius: BorderRadius.circular(10),
                            onPressed: () {
                              final selectedEntries = entries
                                  .where((e) => selectedIds.contains(e.id))
                                  .toList();
                              if (selectedEntries.isEmpty) {
                                Navigator.of(context).pop();
                                return;
                              }
                              provider.importFromTimeTable(
                                TimeTable(entries: selectedEntries),
                              );
                              Navigator.of(context).pop();
                            },
                            child: const Text('Add selected'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _ImportEntryDetails extends StatelessWidget {
  final TimeTableEntry entry;

  const _ImportEntryDetails({required this.entry});

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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: CupertinoColors.systemGrey6,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.subjectName,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: CupertinoColors.black,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${_formatDay(entry.day)} • ${_formatTimeOfDay(entry.interval.start)} - ${_formatTimeOfDay(entry.interval.end)} • ${entry.room} • ${entry.format}',
                  style: TextStyle(
                    fontSize: 11,
                    color: CupertinoColors.systemGrey.darkColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
