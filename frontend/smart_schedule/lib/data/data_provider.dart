import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/data/api_handler.dart';
import 'package:smart_schedule/models/field.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';

class DataProvider extends ChangeNotifier {
  final ApiHandler api;

  DataProvider({required this.api});

  TimeTable? currentTimeTable;
  bool? isTeacher;
  bool isLoading = false;

  TeacherName? selectedTeacher;
  Field? selectedField;
  int? selectedYear;

  List<TeacherName> teachers = <TeacherName>[];
  List<Field> fields = <Field>[];
  List<Subject> subjects = <Subject>[];

  void setIsTeacher(bool value) {
    isTeacher = value;
    notifyListeners();
  }

  void setIsLoading(bool value) {
    isLoading = value;
    notifyListeners();
  }

  Future<void> loadTeachers() async {
    setIsLoading(true);
    try {
      teachers = await api.fetchTeachers();
    } finally {
      setIsLoading(false);
    }
  }

  Future<void> selectTeacherAndLoadTimeTable(TeacherName teacher) async {
    selectedTeacher = teacher;
    setIsLoading(true);
    try {
      final TeacherTimeTable tt = await api.fetchTeacherTimeTable(
        teacher: teacher,
      );
      currentTimeTable = tt;
      subjects = _buildSubjectsFromEntries(tt.entries);
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  Future<void> loadFields() async {
    setIsLoading(true);
    try {
      fields = await api.fetchFields();
    } finally {
      setIsLoading(false);
    }
  }

  Future<void> selectFieldYearAndLoadTimeTable({
    required Field field,
    required int year,
  }) async {
    selectedField = field;
    selectedYear = year;
    setIsLoading(true);
    try {
      final StudentTimeTable tt = await api.fetchStudentTimeTable(
        field: field,
        year: year,
      );
      currentTimeTable = tt;
      subjects = _buildSubjectsFromEntries(tt.entries);
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  void addEntry(TimeTableEntry entry) {
    if (currentTimeTable == null) return;
    currentTimeTable!.addEntry(entry);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    notifyListeners();
  }

  void removeEntry(int id) {
    if (currentTimeTable == null) return;
    currentTimeTable!.removeEntry(id);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    notifyListeners();
  }

  void updateEntry(TimeTableEntry entry) {
    if (currentTimeTable == null) return;
    currentTimeTable!.updateEntry(entry);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    notifyListeners();
  }

  void addSubject(Subject subject) {
    if (currentTimeTable == null) return;
    currentTimeTable!.addSubject(subject);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    notifyListeners();
  }

  List<Subject> _buildSubjectsFromEntries(List<TimeTableEntry> entries) {
    final Map<String, List<TimeTableEntry>> byName =
        <String, List<TimeTableEntry>>{};
    for (final TimeTableEntry e in entries) {
      byName.putIfAbsent(e.subjectName, () => <TimeTableEntry>[]).add(e);
    }
    int idx = 0;
    return byName.entries
        .map(
          (MapEntry<String, List<TimeTableEntry>> en) =>
              Subject(name: en.key, id: idx++, entries: en.value),
        )
        .toList(growable: false);
  }
}
