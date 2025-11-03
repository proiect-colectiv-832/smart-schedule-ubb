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
        middle: Text('Select Your Program'),
      ),
      child: SafeArea(
        child: provider.isLoading
            ? const Center(child: CupertinoActivityIndicator())
            : LayoutBuilder(
                builder: (BuildContext context, BoxConstraints constraints) {
                  final double maxWidth = constraints.maxWidth;
                  final bool isWideScreen = maxWidth > 600;
                  
                  return Container(
                    color: CupertinoColors.systemGroupedBackground,
                    child: Center(
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          maxWidth: isWideScreen ? 600 : maxWidth,
                        ),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(24.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: <Widget>[
                              // Header
                              const Icon(
                                CupertinoIcons.book_fill,
                                size: 64,
                                color: CupertinoColors.systemBlue,
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Choose Your Field',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: CupertinoColors.black,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Select your field of study and academic year',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 16,
                                  color: CupertinoColors.systemGrey.darkColor,
                                ),
                              ),
                              const SizedBox(height: 40),
                              
                              // Field Selection Card
                              Container(
                                decoration: BoxDecoration(
                                  color: CupertinoColors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: CupertinoColors.systemGrey.withOpacity(0.1),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.all(20.0),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Row(
                                            children: [
                                              Icon(
                                                CupertinoIcons.square_list,
                                                size: 20,
                                                color: CupertinoColors.systemBlue,
                                              ),
                                              SizedBox(width: 8),
                                              Text(
                                                'Field of Study',
                                                style: TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w600,
                                                  color: CupertinoColors.black,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 12),
                                          _FieldDropdown(
                                            items: fields,
                                            value: _selectedField,
                                            onChanged: (Field? f) {
                                              setState(() {
                                                _selectedField = f;
                                                _selectedYear = null;
                                              });
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (_selectedField != null) ...[
                                      Container(
                                        height: 1,
                                        color: CupertinoColors.separator,
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.all(20.0),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Row(
                                              children: [
                                                Icon(
                                                  CupertinoIcons.calendar,
                                                  size: 20,
                                                  color: CupertinoColors.systemBlue,
                                                ),
                                                SizedBox(width: 8),
                                                Text(
                                                  'Academic Year',
                                                  style: TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w600,
                                                    color: CupertinoColors.black,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 12),
                                            _YearSelector(
                                              years: years,
                                              selectedYear: _selectedYear,
                                              onYearSelected: (int? y) {
                                                setState(() => _selectedYear = y);
                                              },
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              
                              const SizedBox(height: 32),
                              
                              // Continue Button
                              CupertinoButton(
                                onPressed: (_selectedField != null && _selectedYear != null)
                                    ? () async {
                                        final NavigatorState navigator = Navigator.of(context);
                                        await provider.selectFieldYearAndLoadTimeTable(
                                          field: _selectedField!,
                                          year: _selectedYear!,
                                        );
                                        if (!mounted) return;
                                        navigator.push(
                                          CupertinoPageRoute<void>(
                                            builder: (_) => const StudentTimeTableScreen(),
                                          ),
                                        );
                                      }
                                    : null,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                color: CupertinoColors.systemBlue,
                                borderRadius: BorderRadius.circular(12),
                                child: const Text(
                                  'Continue to Schedule',
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w600,
                                    color: CupertinoColors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _FieldDropdown extends StatelessWidget {
  final List<Field> items;
  final Field? value;
  final ValueChanged<Field?> onChanged;

  const _FieldDropdown({
    required this.items,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () async {
        final Field? result = await showCupertinoModalPopup<Field>(
          context: context,
          builder: (_) => _FieldSelector(items: items),
        );
        if (result != null) {
          onChanged(result);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: CupertinoColors.systemGrey6,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: value != null 
                ? CupertinoColors.systemBlue.withOpacity(0.3)
                : CupertinoColors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              value?.name ?? 'Select a field',
              style: TextStyle(
                fontSize: 16,
                color: value != null 
                    ? CupertinoColors.black
                    : CupertinoColors.systemGrey.darkColor,
              ),
            ),
            const Icon(
              CupertinoIcons.chevron_down,
              size: 20,
              color: CupertinoColors.systemGrey,
            ),
          ],
        ),
      ),
    );
  }
}

class _FieldSelector extends StatelessWidget {
  final List<Field> items;

  const _FieldSelector({required this.items});

  @override
  Widget build(BuildContext context) {
    return CupertinoActionSheet(
      title: const Text(
        'Select Field',
        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
      actions: items
          .map(
            (Field item) => CupertinoActionSheetAction(
              onPressed: () => Navigator.of(context).pop<Field>(item),
              child: Text(item.name),
            ),
          )
          .toList(),
      cancelButton: CupertinoActionSheetAction(
        onPressed: () => Navigator.of(context).pop(),
        isDestructiveAction: true,
        child: const Text('Cancel'),
      ),
    );
  }
}

class _YearSelector extends StatelessWidget {
  final List<int> years;
  final int? selectedYear;
  final ValueChanged<int?> onYearSelected;

  const _YearSelector({
    required this.years,
    required this.selectedYear,
    required this.onYearSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: years.map((year) {
        final isSelected = selectedYear == year;
        return GestureDetector(
          onTap: () => onYearSelected(year),
          child: Container(
            width: 80,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: isSelected 
                  ? CupertinoColors.systemBlue
                  : CupertinoColors.systemGrey6,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected
                    ? CupertinoColors.systemBlue
                    : CupertinoColors.transparent,
                width: 2,
              ),
            ),
            child: Column(
              children: [
                Text(
                  'Year',
                  style: TextStyle(
                    fontSize: 12,
                    color: isSelected 
                        ? CupertinoColors.white
                        : CupertinoColors.systemGrey.darkColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$year',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: isSelected 
                        ? CupertinoColors.white
                        : CupertinoColors.black,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
