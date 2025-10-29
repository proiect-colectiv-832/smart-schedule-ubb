import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/data_provider.dart';
import 'package:smart_schedule/models/field.dart';
import 'package:smart_schedule/presentation/app_scope.dart';
import 'package:smart_schedule/presentation/student/student_timetable_screen.dart';

class FieldSelectScreen extends StatefulWidget {
  const FieldSelectScreen({super.key});

  @override
  State<FieldSelectScreen> createState() => _FieldSelectScreenState();
}

class _FieldSelectScreenState extends State<FieldSelectScreen> {
  Field? _selectedField;
  int? _selectedYear;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final DataProvider provider = AppScope.of(context);
      provider.loadFields();
    });
  }

  @override
  Widget build(BuildContext context) {
    final DataProvider provider = AppScope.of(context);
    final List<Field> fields = provider.fields;
    final List<int> years = _selectedField?.years ?? <int>[];
    return CupertinoPageScaffold(
      navigationBar: const CupertinoNavigationBar(
        middle: Text('Select Field & Year'),
      ),
      child: SafeArea(
        child: provider.isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const SizedBox(height: 8),
                    const Text(
                      'Field',
                      style: TextStyle(
                        fontSize: 14,
                        color: CupertinoColors.inactiveGray,
                      ),
                    ),
                    const SizedBox(height: 6),
                    _Dropdown<Field>(
                      items: fields,
                      labelBuilder: (Field f) => f.name,
                      value: _selectedField,
                      onChanged: (Field? f) {
                        setState(() {
                          _selectedField = f;
                          _selectedYear = null;
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Year',
                      style: TextStyle(
                        fontSize: 14,
                        color: CupertinoColors.inactiveGray,
                      ),
                    ),
                    const SizedBox(height: 6),
                    _Dropdown<int>(
                      items: years,
                      labelBuilder: (int y) => 'Year $y',
                      value: _selectedYear,
                      onChanged: (int? y) {
                        setState(() => _selectedYear = y);
                      },
                    ),
                    const Spacer(),
                    CupertinoButton.filled(
                      onPressed:
                          (_selectedField != null && _selectedYear != null)
                          ? () async {
                              await provider.selectFieldYearAndLoadTimeTable(
                                field: _selectedField!,
                                year: _selectedYear!,
                              );
                              if (!mounted) return;
                              Navigator.of(context).push(
                                CupertinoPageRoute<void>(
                                  builder: (_) =>
                                      const StudentTimeTableScreen(),
                                ),
                              );
                            }
                          : null,
                      child: const Text('Continue'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _Dropdown<T> extends StatelessWidget {
  final List<T> items;
  final String Function(T) labelBuilder;
  final T? value;
  final ValueChanged<T?> onChanged;

  const _Dropdown({
    required this.items,
    required this.labelBuilder,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: CupertinoColors.systemGrey6,
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: CupertinoButton(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        color: CupertinoColors.systemGrey6,
        onPressed: () async {
          final T? result = await showCupertinoModalPopup<T>(
            context: context,
            builder: (_) {
              return _ActionSheetSelector<T>(
                items: items,
                labelBuilder: labelBuilder,
              );
            },
          );
          onChanged(result);
        },
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(
            value == null ? 'Select' : labelBuilder(value as T),
            style: const TextStyle(fontSize: 16),
          ),
        ),
      ),
    );
  }
}

class _ActionSheetSelector<T> extends StatelessWidget {
  final List<T> items;
  final String Function(T) labelBuilder;

  const _ActionSheetSelector({required this.items, required this.labelBuilder});

  @override
  Widget build(BuildContext context) {
    return CupertinoActionSheet(
      actions: items
          .map(
            (T item) => CupertinoActionSheetAction(
              onPressed: () => Navigator.of(context).pop<T>(item),
              child: Text(labelBuilder(item)),
            ),
          )
          .toList(),
      cancelButton: CupertinoActionSheetAction(
        onPressed: () => Navigator.of(context).pop<T>(null),
        isDefaultAction: true,
        child: const Text('Cancel'),
      ),
    );
  }
}
