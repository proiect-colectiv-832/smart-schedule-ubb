import 'package:flutter/widgets.dart';
import 'package:smart_schedule/models/field.dart';

Widget buildWebFieldDropdown({
  required List<Field> items,
  required Field? value,
  required ValueChanged<Field?> onChanged,
}) {
  
  return const SizedBox.shrink();
}

Widget buildWebYearDropdown({
  required List<int> years,
  required int? value,
  required ValueChanged<int?> onChanged,
}) {
  return const SizedBox.shrink();
}
