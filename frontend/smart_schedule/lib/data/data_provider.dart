import 'package:flutter/cupertino.dart';
import 'package:smart_schedule/models/timetable.dart';

class DataProvider extends ChangeNotifier {
  TimeTable? currentTimeTable;
  bool? isTeacher;
  bool isLoading = false;

  void setIsTeacher(bool value) {
    isTeacher = value;
    notifyListeners();
  }

  void setIsLoading(bool value) {
    isLoading = value;
    notifyListeners();
  }
}
