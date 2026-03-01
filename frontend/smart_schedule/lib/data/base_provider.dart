import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/api_handler.dart';
import 'package:smart_schedule/models/field.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';

abstract class BaseProvider extends ChangeNotifier {
  ApiHandler get api;
  TimeTable? currentTimeTable;
  bool? isTeacher;
  bool isLoading = false;

  
  TeacherName? selectedTeacher;
  Field? selectedField;
  int? selectedYear;

  
  List<TeacherName> teachers = <TeacherName>[];
  List<Field> fields = <Field>[];
  List<Subject> subjects = <Subject>[];
  List<StudentTimeTable> fieldYearTimetables = <StudentTimeTable>[];

  
  bool get isPersonalizationEnabled;

  void setIsTeacher(bool value) {
    isTeacher = value;
    notifyListeners();
  }

  void setIsLoading(bool value) {
    isLoading = value;
    notifyListeners();
  }

  
  Future<void> loadTeachers();
  Future<void> selectTeacherAndLoadTimeTable(TeacherName teacher);
  Future<void> loadFields();
  Future<void> selectFieldYearAndLoadTimeTable({
    required Field field,
    required int year,
  });
  Future<void> loadFieldYearTimetables({
    required Field field,
    required int year,
  });

  
  void addEntry(TimeTableEntry entry);
  void removeEntry(int id);
  void updateEntry(TimeTableEntry entry);
  void addSubject(Subject subject);
  void importFromTimeTable(TimeTable timetable);
  void clearAllEntries();
}
