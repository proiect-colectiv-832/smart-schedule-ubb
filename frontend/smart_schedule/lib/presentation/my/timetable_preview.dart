import 'package:flutter/material.dart';


class TimetablePreview extends StatelessWidget {
  final String markdownText;

  const TimetablePreview({required this.markdownText, super.key});

  @override
  Widget build(BuildContext context) {
    
    final lines = markdownText
        .split('\n')
        .where((line) => line.isNotEmpty)
        .toList();

    if (lines.length < 2) {
      return const Center(child: Text('No data available'));
    }

    
    final headerLine = lines[0];
    final headers = _parseTableRow(headerLine);

    
    
    final dataRows = lines.skip(2).map(_parseTableRow).toList();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SingleChildScrollView(
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(Colors.blue.shade50),
            border: TableBorder.all(color: Colors.grey.shade300),
            columns: headers
                .map(
                  (header) => DataColumn(
                    label: Text(
                      header.trim(),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
                )
                .toList(),
            rows: dataRows
                .map(
                  (row) => DataRow(
                    cells: row
                        .map(
                          (cell) => DataCell(
                            Text(
                              cell.trim(),
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
  }

  List<String> _parseTableRow(String row) {
    
    final cleaned = row.trim();
    if (cleaned.startsWith('|')) {
      return cleaned
          .substring(1, cleaned.length - (cleaned.endsWith('|') ? 1 : 0))
          .split('|')
          .map((cell) => cell.trim())
          .toList();
    }
    return <String>[];
  }
}
