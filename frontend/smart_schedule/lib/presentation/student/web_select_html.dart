import 'dart:html' as html;
import 'dart:ui_web' as ui;

import 'package:flutter/widgets.dart';
import 'package:smart_schedule/models/field.dart';

Widget buildWebFieldDropdown({
  required List<Field> items,
  required Field? value,
  required ValueChanged<Field?> onChanged,
}) {
  final String viewType =
      'field-select-${DateTime.now().microsecondsSinceEpoch}';

  ui.platformViewRegistry.registerViewFactory(viewType, (int viewId) {
    final select = html.SelectElement()
      ..style.width = '100%'
      ..style.height = '40px'
      ..classes.add('field-select');

    select.children.add(
      html.OptionElement(
        data: 'Select a field',
        value: '',
        selected: value == null,
      ),
    );

    for (final field in items) {
      select.children.add(
        html.OptionElement(
          data: field.name,
          value: field.id.toString(),
          selected: value?.id == field.id,
        ),
      );
    }

    select.onChange.listen((event) {
      final selectedValue = select.value;
      if (selectedValue == null || selectedValue.isEmpty) {
        onChanged(null);
      } else {
        final selectedField = items.firstWhere(
          (f) => f.id.toString() == selectedValue,
        );
        onChanged(selectedField);
      }
    });

    return select;
  });

  return SizedBox(height: 42, child: HtmlElementView(viewType: viewType));
}

Widget buildWebYearDropdown({
  required List<int> years,
  required int? value,
  required ValueChanged<int?> onChanged,
}) {
  final String viewType =
      'year-select-${DateTime.now().microsecondsSinceEpoch}';

  ui.platformViewRegistry.registerViewFactory(viewType, (int viewId) {
    final select = html.SelectElement()
      ..style.width = '100%'
      ..style.height = '40px'
      ..classes.add('year-select');

    select.children.add(
      html.OptionElement(
        data: 'Select year',
        value: '',
        selected: value == null,
      ),
    );

    for (final year in years) {
      select.children.add(
        html.OptionElement(
          data: 'Year $year',
          value: year.toString(),
          selected: value == year,
        ),
      );
    }

    select.onChange.listen((event) {
      final selectedValue = select.value;
      if (selectedValue == null || selectedValue.isEmpty) {
        onChanged(null);
      } else {
        onChanged(int.tryParse(selectedValue));
      }
    });

    return select;
  });

  return SizedBox(height: 42, child: HtmlElementView(viewType: viewType));
}
