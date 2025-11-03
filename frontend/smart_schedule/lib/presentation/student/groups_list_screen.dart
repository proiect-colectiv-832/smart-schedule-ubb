import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetables.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/student/readonly_timetable_screen.dart';

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
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(middle: Text('Select Group')),
      child: SafeArea(
        child: provider.isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : ListView.separated(
                padding: const EdgeInsets.all(16),
                itemBuilder: (BuildContext context, int index) {
                  final StudentTimeTable st =
                      provider.fieldYearTimetables[index];
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
                                st.groupName,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${st.field.name} • Year ${st.year}',
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
                          onPressed: () {
                            Navigator.of(context).push(
                              CupertinoPageRoute<void>(
                                builder: (_) =>
                                    ReadonlyTimetableScreen(timetable: st),
                              ),
                            );
                          },
                          child: const Text('View'),
                        ),
                        if (provider.isPersonalizationEnabled)
                          CupertinoButton(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 6,
                            ),
                            onPressed: () {
                              provider.importFromTimeTable(st);
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
    );
  }
}
