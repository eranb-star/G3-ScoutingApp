import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_db.g.dart';

class ScoutEntries extends Table {
  TextColumn get id => text()();
  TextColumn get eventId => text()();
  TextColumn get matchId => text()();
  IntColumn get teamNumber => integer()();

  TextColumn get status => text()(); // SUBMITTED/SYNCED...
  IntColumn get retryCount => integer().withDefault(const Constant(0))();

  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get syncedAt => dateTime().nullable()();

  TextColumn get deviceId => text()();
  TextColumn get dataJson => text()();
  TextColumn get notes => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [ScoutEntries])
class AppDb extends _$AppDb {
  AppDb() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  Future<void> upsertEntry(ScoutEntriesCompanion entry) =>
      into(scoutEntries).insertOnConflictUpdate(entry);
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'scouting.sqlite'));
    return NativeDatabase(file);
  });
}
