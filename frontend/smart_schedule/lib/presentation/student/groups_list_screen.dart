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
                  // Header with title and back button
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
                  // Groups list
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
    final entries = timetable.entries;
    final entryCount = entries.length;

    showCupertinoDialog(
      context: context,
      builder: (BuildContext context) => CupertinoAlertDialog(
        title: const Text('Import All Classes'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            Text(
              'This will add $entryCount ${entryCount == 1 ? 'class' : 'classes'} from ${timetable.groupName} to your timetable.',
              style: const TextStyle(fontSize: 14),
            ),
            if (entryCount > 0) ...[
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
                  itemCount: entryCount > 10 ? 10 : entryCount,
                  separatorBuilder: (_, __) => const SizedBox(height: 4),
                  itemBuilder: (context, index) {
                    final entry = entries[index];
                    return _ImportEntryItem(entry: entry);
                  },
                ),
              ),
              if (entryCount > 10)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    '... and ${entryCount - 10} more',
                    style: TextStyle(
                      fontSize: 12,
                      color: CupertinoColors.systemGrey.darkColor,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
            ],
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
              provider.importFromTimeTable(timetable);
              Navigator.of(context).pop();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

class _ImportEntryItem extends StatelessWidget {
  final TimeTableEntry entry;

  const _ImportEntryItem({required this.entry});

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
                  '${_formatDay(entry.day)} • ${_formatTimeOfDay(entry.interval.start)} - ${_formatTimeOfDay(entry.interval.end)} • ${entry.room}',
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
