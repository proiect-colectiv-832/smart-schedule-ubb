import 'package:smart_schedule/models/field.dart';
import 'package:smart_schedule/models/timetable.dart';

class TeacherTimeTable extends TimeTable {
  final TeacherName name;

  TeacherTimeTable({required this.name, required super.entries});
}

class StudentTimeTable extends TimeTable {
  final Field field;
  final int year;
  final String groupName;
  StudentTimeTable({
    required this.field,
    required this.year,
    required this.groupName,
    required super.entries,
  });
}
