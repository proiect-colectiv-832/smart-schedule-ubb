import 'package:smart_schedule/models/timetable.dart';

class Field {
  final String name;
  final int id;
  final List<int> years;
  Field({required this.name, required this.id, required this.years});
  @override
  String toString() {
    return '$name $years';
  }
}

class FieldYearTimeTable {
  final Field field;
  final int year;
  Map<String, TimeTable> timeTables;
  FieldYearTimeTable({
    required this.field,
    required this.year,
    required this.timeTables,
  });
  @override
  String toString() {
    return field.toString();
  }
}
