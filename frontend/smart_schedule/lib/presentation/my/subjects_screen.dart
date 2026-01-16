import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/utils/platform_service.dart';

class SubjectsScreen extends StatefulWidget {
  const SubjectsScreen({super.key});

  @override
  State<SubjectsScreen> createState() => _SubjectsScreenState();
}

class _SubjectsScreenState extends State<SubjectsScreen> {
  List<Subject> _allSubjects = [];
  List<Subject> _filteredSubjects = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadAllSubjects();
  }

  void _filterSubjects(String query) {
    setState(() {
      _searchQuery = query;
      if (query.isEmpty) {
        _filteredSubjects = _allSubjects;
      } else {
        _filteredSubjects = _allSubjects
            .where(
              (subject) =>
                  subject.name.toLowerCase().contains(query.toLowerCase()) ||
                  subject.id.toLowerCase().contains(query.toLowerCase()),
            )
            .toList();
      }
    });
  }

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

  Future<void> _loadAllSubjects() async {
    final BaseProvider provider = AppScope.of(context);

    try {
      _allSubjects = await provider.api.fetchSubjects();
      _allSubjects.sort((a, b) => a.name.compareTo(b.name));
      _filteredSubjects = _allSubjects;
    } catch (e) {
      _allSubjects = [];
      _filteredSubjects = [];
    }

    setState(() {
      _isLoading = false;
    });
  }

  void _showSubjectPreview(Subject subject) {
    final List<TimeTableEntry> entries = List<TimeTableEntry>.from(
      subject.entries,
    );
    final Set<int> selectedIds = entries.map((e) => e.id).toSet();
    List<TimeTableEntry> filtered = List<TimeTableEntry>.from(entries);
    String query = '';

    showCupertinoModalPopup(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            void filter(String q) {
              setState(() {
                query = q;
                if (q.isEmpty) {
                  filtered = List<TimeTableEntry>.from(entries);
                } else {
                  filtered = entries
                      .where(
                        (entry) =>
                            entry.subjectName.toLowerCase().contains(
                              q.toLowerCase(),
                            ) ||
                            entry.teacher.name.toLowerCase().contains(
                              q.toLowerCase(),
                            ) ||
                            entry.room.toLowerCase().contains(
                              q.toLowerCase(),
                            ) ||
                            _formatDay(
                              entry.day,
                            ).toLowerCase().contains(q.toLowerCase()),
                      )
                      .toList();
                }
              });
            }

            return SafeArea(
              top: false,
              child: Container(
                height: MediaQuery.of(context).size.height * 0.8,
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
                      'Add ${subject.name}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      'ID: ${subject.id}',
                      style: TextStyle(
                        fontSize: 13,
                        color: CupertinoColors.systemGrey.darkColor,
                      ),
                    ),
                    const SizedBox(height: 12),
                    CupertinoSearchTextField(
                      prefixIcon: const Icon(
                        CupertinoIcons.search,
                        color: CupertinoColors.systemGrey,
                      ),
                      placeholder: 'Search entries...',
                      onChanged: filter,
                      style: const TextStyle(fontSize: 14),
                    ),
                    if (query.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '${filtered.length} ${filtered.length == 1 ? 'entry' : 'entries'} found',
                          style: TextStyle(
                            fontSize: 12,
                            color: CupertinoColors.systemGrey.darkColor,
                          ),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        '${selectedIds.length} of ${entries.length} selected',
                        style: TextStyle(
                          fontSize: 12,
                          color: CupertinoColors.systemGrey.darkColor,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: filtered.isEmpty
                          ? const Center(
                              child: Text(
                                'No entries found',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: CupertinoColors.systemGrey,
                                ),
                              ),
                            )
                          : ListView.separated(
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final entry = filtered[index];
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
                                        child: _EntryPreviewTile(entry: entry),
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
                              final BaseProvider provider = AppScope.of(
                                context,
                              );
                              provider.addSubject(
                                Subject(
                                  name: subject.name,
                                  id: subject.id,
                                  entries: selectedEntries,
                                ),
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

  @override
  Widget build(BuildContext context) {
    final Widget content = CupertinoPageScaffold(
      backgroundColor: CupertinoColors.white,
      navigationBar: null,
      child: SafeArea(
        child: _isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : Column(
                children: [
                  
                  Padding(
                    padding: const EdgeInsets.all(16.0),
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
                          'Add Subjects',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: CupertinoColors.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: CupertinoSearchTextField(
                      prefixIcon: const Icon(
                        CupertinoIcons.search,
                        color: CupertinoColors.systemGrey,
                      ),
                      placeholder: 'Search subjects...',
                      onChanged: _filterSubjects,
                      style: const TextStyle(fontSize: 16),
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  if (_searchQuery.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          '${_filteredSubjects.length} ${_filteredSubjects.length == 1 ? 'subject' : 'subjects'} found',
                          style: TextStyle(
                            fontSize: 14,
                            color: CupertinoColors.systemGrey.darkColor,
                          ),
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  
                  Expanded(
                    child: _allSubjects.isEmpty
                        ? Center(
                            child: Text(
                              'No subjects available',
                              style: TextStyle(
                                fontSize: 16,
                                color: CupertinoColors.systemGrey.darkColor,
                              ),
                            ),
                          )
                        : _filteredSubjects.isEmpty
                        ? Center(
                            child: Text(
                              'No subjects found',
                              style: TextStyle(
                                fontSize: 16,
                                color: CupertinoColors.systemGrey.darkColor,
                              ),
                            ),
                          )
                        : LayoutBuilder(
                            builder: (context, constraints) {
                              final double width = constraints.maxWidth;
                              int crossAxisCount = (width / 180).floor();
                              if (crossAxisCount < 2) crossAxisCount = 2;

                              return GridView.builder(
                                padding: const EdgeInsets.all(16),
                                gridDelegate:
                                    SliverGridDelegateWithFixedCrossAxisCount(
                                      crossAxisCount: crossAxisCount,
                                      crossAxisSpacing: 12,
                                      mainAxisSpacing: 12,
                                      childAspectRatio: 2.5,
                                    ),
                                itemCount: _filteredSubjects.length,
                                itemBuilder: (context, index) {
                                  final Subject subject =
                                      _filteredSubjects[index];
                                  return _SubjectTile(
                                    subject: subject,
                                    onTap: () => _showSubjectPreview(subject),
                                  );
                                },
                              );
                            },
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
}

class _SubjectTile extends StatelessWidget {
  final Subject subject;
  final VoidCallback onTap;

  const _SubjectTile({required this.subject, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: CupertinoColors.systemGrey6,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: CupertinoColors.systemGrey4, width: 1),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              subject.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: CupertinoColors.black,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'ID: ${subject.id}',
              style: TextStyle(
                fontSize: 11,
                color: CupertinoColors.systemGrey.darkColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EntryPreviewTile extends StatelessWidget {
  final TimeTableEntry entry;

  const _EntryPreviewTile({required this.entry});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      decoration: BoxDecoration(
        color: CupertinoColors.systemGrey6,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${_formatDay(entry.day)} • ${_formatTimeOfDay(entry.interval.start)} - ${_formatTimeOfDay(entry.interval.end)}',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: CupertinoColors.black,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${entry.room} • ${entry.teacher.name}',
            style: TextStyle(
              fontSize: 11,
              color: CupertinoColors.systemGrey.darkColor,
            ),
          ),
        ],
      ),
    );
  }

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
}
